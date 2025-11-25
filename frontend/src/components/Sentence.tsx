// frontend/src/components/Sentence.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  pointerWithin,
  closestCenter,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type UniqueIdentifier,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  question: string;
  options?: string[];
  selectedOrder?: string[];
  onPick?: (part: string) => void;
  onRemove?: (part: string) => void;
  onReorder?: (order: string[]) => void;
  showFeedback?: boolean;
  isCorrect?: boolean;
}

const CARD_TEXT_CLASS =
  "text-base font-medium whitespace-nowrap overflow-hidden";

function SortablePlacedItem({
  id,
  value,
  onRemove,
  disabled = false,
}: {
  id: UniqueIdentifier;
  value: string;
  onRemove?: (id: string) => void;
  disabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    visibility: isDragging ? "hidden" : "visible",
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled && !isDragging && e.detail > 0 && onRemove) {
      onRemove(String(id));
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      role="listitem"
      className={`flex-none rounded-xl bg-rose-100 border border-rose-300 text-rose-800 shadow-sm flex items-center select-none m-1 ${
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "z-50 opacity-50" : ""}`}
    >
      <div className={`inline-flex items-center px-3 py-2 ${CARD_TEXT_CLASS}`}>
        {value}
      </div>
    </div>
  );
}

function PoolItem({
  value,
  onAdd,
  disabled,
}: {
  value: string;
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onAdd()}
      disabled={disabled}
      className={`flex-none text-left rounded-xl transition-all duration-200 inline-flex items-center m-1 ${
        disabled
          ? "cursor-not-allowed bg-gray-50 text-gray-400 border border-gray-200"
          : "hover:shadow-md active:scale-95 bg-white border border-gray-200 text-foreground"
      }`}
    >
      <div className={`inline-flex items-center px-3 py-2 ${CARD_TEXT_CLASS}`}>
        {value}
      </div>
    </button>
  );
}

function mapWordsToIds(
  words: string[],
  uniqueOptions: { id: string; word: string }[]
): string[] {
  if (!words || words.length === 0) return [];
  const idPool = [...uniqueOptions];
  const resultIds: string[] = [];
  for (const word of words) {
    const poolIndex = idPool.findIndex((item) => item.word === word);
    if (poolIndex !== -1) {
      const foundItem = idPool.splice(poolIndex, 1)[0];
      resultIds.push(foundItem.id);
    }
  }
  return resultIds;
}

const Sentence: React.FC<Props> = ({
  question,
  options = [],
  selectedOrder = [],
  onPick,
  onRemove,
  onReorder,
  showFeedback = false,
}) => {
  const { uniqueOptions, wordMap } = useMemo(() => {
    const map = new Map<string, string>();
    const optionsWithIds = options.map((word, index) => {
      const id = `${word}-${index}`;
      map.set(id, word);
      return { id, word };
    });
    return { uniqueOptions: optionsWithIds, wordMap: map };
  }, [options]);

  const [placedIds, setPlacedIds] = useState<string[]>(() =>
    mapWordsToIds(selectedOrder, uniqueOptions)
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  useEffect(() => {
    setPlacedIds(mapWordsToIds(selectedOrder, uniqueOptions));
  }, [selectedOrder, uniqueOptions]);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleAdd = (id: string) => {
    if (placedIds.includes(id)) return;
    const nextIds = [...placedIds, id];
    setPlacedIds(nextIds);
    const word = wordMap.get(id);
    if (word) onPick?.(word);
    onReorder?.(nextIds.map((pid) => wordMap.get(pid)!));
  };

  const handleRemove = (id: string) => {
    const nextIds = placedIds.filter((p) => p !== id);
    setPlacedIds(nextIds);
    const word = wordMap.get(id);
    if (word) onRemove?.(word);
    onReorder?.(nextIds.map((pid) => wordMap.get(pid)!));
  };

  const customCollisionStrategy: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const droppableContainers = args.droppableContainers.filter(
      (container) =>
        container.id !== "pool" && placedIds.includes(String(container.id))
    );
    return closestCenter({
      ...args,
      droppableContainers: droppableContainers,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (showFeedback) return;
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (showFeedback) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overIdStr = String(over.id);
    if (!placedIds.includes(overIdStr)) return;
    const activeIdStr = String(active.id);
    const oldIndex = placedIds.indexOf(activeIdStr);
    const newIndex = placedIds.indexOf(overIdStr);
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      setPlacedIds((items) => {
        const currentOldIndex = items.indexOf(activeIdStr);
        const currentNewIndex = items.indexOf(overIdStr);
        if (currentOldIndex !== currentNewIndex) {
          return arrayMove(items, currentOldIndex, currentNewIndex);
        }
        return items;
      });
    }
  };

  const handleDragEnd = () => {
    setActiveId(null);
    if (placedIds.length > 0) {
      onReorder?.(placedIds.map((id) => wordMap.get(id)!));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 1. 질문 영역 (상단 고정) */}
      <div className="shrink-0 space-y-2 pb-2">
        <h1 className="text-xl font-bold text-foreground">문장 배열하기</h1>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <span className="text-lg font-medium text-foreground break-keep">
            {question}
          </span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* 2. 정답 영역 (중간) */}
        {/* 중요 변경: max-h 제한을 60vh 등으로 매우 크게 잡아주고 shrink-0 적용.
            단어가 많아지면 이 영역이 커지고, 하단 Pool 영역이 줄어듦.
            Pool 영역이 너무 작아지면 그때서야 Pool 영역에 스크롤이 생김. */}
        <div className="shrink-0 max-h-[60vh] flex flex-col min-h-[100px] mb-2">
          <div className="flex-1 bg-white border-2 border-dashed border-gray-200 rounded-xl p-2 overflow-y-auto transition-colors hover:border-rose-200">
            <SortableContext items={placedIds} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap items-start content-start min-h-full">
                {placedIds.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm py-6">
                    단어를 선택하여 문장을 완성하세요
                  </div>
                ) : (
                  placedIds.map((id) => (
                    <SortablePlacedItem
                      key={id}
                      id={id}
                      value={wordMap.get(id)!}
                      onRemove={handleRemove}
                      disabled={showFeedback}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </div>
        </div>

        {/* 3. 보기(Pool) 영역 (하단 채움) */}
        {/* flex-1, min-h-0을 사용하여 남은 공간을 차지. 공간이 부족하면 스크롤 발생. */}
        <div className="flex-1 min-h-0 bg-white -mx-4 px-4 pt-4 flex flex-col">
          <div className="flex-1 overflow-y-auto pb-4">
            <div className="flex flex-wrap content-start">
              {uniqueOptions
                .filter(({ id }) => !placedIds.includes(id))
                .map(({ id, word }) => (
                  <PoolItem
                    key={id}
                    value={word}
                    onAdd={() => handleAdd(id)}
                    disabled={showFeedback}
                  />
                ))}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 160 }}>
          {activeId ? (
            <div className="rounded-xl bg-white border-2 border-rose-400 shadow-xl flex items-center select-none scale-[1.05] z-50">
              <div
                className={`inline-flex items-center px-3 py-2 ${CARD_TEXT_CLASS}`}
              >
                {wordMap.get(String(activeId)) ?? ""}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Sentence;
