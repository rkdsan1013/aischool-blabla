// src/components/Writing.tsx
import React, { useEffect, useState } from "react";

interface Props {
  // Training에서 전달하는 원문(한국어) prop 이름을 `sentence`로 수용
  sentence: string;
  // Controlled 모드용 value (부모가 상태를 완전히 제어할 때 사용)
  value?: string;
  // Uncontrolled 초기값(하위 호환용)
  initialValue?: string;
  maxLength?: number;
  onChange?: (value: string) => void;
  // 부모(예: Training)에서 피드백 중일 때 입력을 비활성화하기 위해 추가
  disabled?: boolean;
}

const Writing: React.FC<Props> = ({
  sentence,
  value,
  initialValue = "",
  maxLength = 300,
  onChange,
  disabled = false,
}) => {
  // [수정 핵심 1] Controlled 모드(value prop 존재)인지 확인
  const isControlled = value !== undefined;

  // [수정 핵심 2] Uncontrolled 모드일 때만 사용할 내부 State
  // Controlled 모드일 때는 이 state를 업데이트하지 않음으로써 충돌 방지
  const [uncontrolledValue, setUncontrolledValue] =
    useState<string>(initialValue);

  // [수정 핵심 3] 실제로 렌더링할 값 결정 (prop이 있으면 prop 우선)
  const displayValue = isControlled ? value : uncontrolledValue;

  // initialValue가 변경되었을 때 내부 상태 리셋 (Uncontrolled 모드 리셋용)
  useEffect(() => {
    if (!isControlled) {
      setUncontrolledValue(initialValue);
    }
  }, [initialValue, isControlled]);

  /* [삭제됨] useEffect(() => { if (value !== undefined) setInternalValue(value); }, [value]);
    -> 이 코드가 입력할 때마다 실행되어 커서를 끝으로 보내고 한글을 깨뜨리는 원인이었음.
  */

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return;

    const v = e.target.value;
    const newValue = v.slice(0, maxLength);

    // [수정 핵심 4] Uncontrolled 모드일 때만 내부 state 업데이트
    // Controlled 모드일 때는 부모에게 알리기만 하고, 부모가 내려준 props로만 렌더링 (React의 기본 동작에 맡김)
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }

    onChange?.(newValue);
  };

  const remaining = maxLength - (displayValue?.length || 0);

  return (
    <div className="w-full flex flex-col space-y-4 sm:space-y-5">
      {/* 제목 및 설명 */}
      <div className="text-left px-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          작문 연습
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          아래 한국어 문장을 보고 자연스럽게 영어로 번역하여 작성하세요.
        </p>
      </div>

      {/* 원문 카드 */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6">
        <div className="text-sm font-semibold text-muted-foreground mb-2">
          원문 (한국어)
        </div>
        <div className="text-lg sm:text-xl font-medium text-foreground whitespace-pre-wrap">
          {sentence}
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="relative w-full">
        <textarea
          value={displayValue}
          onChange={handleChange}
          placeholder="여기에 영어로 번역하여 작성하세요..."
          className={`w-full h-48 sm:h-56 p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-500 transition-colors placeholder:text-muted-foreground text-base text-foreground shadow-sm ${
            disabled ? "opacity-60 pointer-events-none bg-gray-50" : ""
          }`}
          aria-label="작문 입력"
        />
        <div
          className={`absolute bottom-4 right-5 text-sm font-medium ${
            remaining < 20 ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {displayValue?.length || 0}/{maxLength}
        </div>
      </div>
    </div>
  );
};

export default Writing;
