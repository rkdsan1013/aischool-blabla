// frontend/src/pages/MyPageProfile.tsx
import React, { useEffect, useRef, useState } from "react";
import { X, Camera, AlertTriangle, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";
import { useAuth } from "../hooks/useAuth";
import {
  updateUserProfile,
  deleteUser,
  changePassword,
} from "../services/userService";

type ProfileState = {
  name: string;
  email: string;
  profileImage: string | null;
};

type PasswordState = {
  current: string;
  new: string;
  confirm: string;
};

type PasswordErrors = {
  current?: string;
  new?: string;
  confirm?: string;
};

const MyPageProfile: React.FC = () => {
  const navigate = useNavigate();
  const { profile: globalProfile, refreshProfile } = useProfile();
  const { logout } = useAuth();

  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    email: "",
    profileImage: null,
  });

  const [passwords, setPasswords] = useState<PasswordState>({
    current: "",
    new: "",
    confirm: "",
  });

  const [pwdErrors, setPwdErrors] = useState<PasswordErrors>({});

  // 탈퇴 모달 (중앙, 2단계)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);

  // 로딩 상태
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // 이미지 미리보기 URL
  const fileUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (globalProfile) {
      setProfile({
        name: globalProfile.name || "",
        email: globalProfile.email,
        profileImage: globalProfile.profile_img || null,
      });
    } else {
      navigate("/");
    }
  }, [globalProfile, navigate]);

  useEffect(() => {
    return () => {
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
    }

    const objUrl = URL.createObjectURL(file);
    fileUrlRef.current = objUrl;
    setProfile((p) => ({ ...p, profileImage: objUrl }));
  };

  // 이름 저장 버튼 활성화 조건:
  // - 이름이 비어있지 않고
  // - 현재 글로벌 프로필의 이름과 달라야 함(변경사항 있을 때만 활성화)
  const isProfileSavable =
    profile.name.trim().length > 0 &&
    profile.name.trim() !== (globalProfile?.name || "").trim();

  const handleSaveProfile = async () => {
    if (loadingSave || !globalProfile || !isProfileSavable) return;
    setLoadingSave(true);

    try {
      const updated = await updateUserProfile({
        name: profile.name.trim(),
        profile_img: profile.profileImage,
      });

      if (!updated) throw new Error("Update failed");

      // 최신 프로필 다시 불러오면 버튼은 자동 비활성화됨(변경사항가 없음 상태로 복귀)
      await refreshProfile();
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setLoadingSave(false);
    }
  };

  const validateNewPassword = (): boolean => {
    const errors: PasswordErrors = {};
    if (!passwords.current.trim()) {
      errors.current = "현재 비밀번호를 입력하세요.";
    }
    if (passwords.new.length < 8) {
      errors.new = "새 비밀번호는 최소 8자 이상이어야 합니다.";
    }
    if (!passwords.confirm.trim()) {
      errors.confirm = "새 비밀번호를 다시 입력하세요.";
    } else if (passwords.new !== passwords.confirm) {
      errors.confirm = "새 비밀번호가 일치하지 않습니다.";
    }

    setPwdErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 비밀번호 버튼 활성화 조건: 모든 입력창이 채워져 있어야 함
  const isPwdFormFilled =
    passwords.current.trim().length > 0 &&
    passwords.new.trim().length > 0 &&
    passwords.confirm.trim().length > 0;

  const handleChangePassword = async () => {
    if (loadingPwd || !isPwdFormFilled) return;
    if (!validateNewPassword()) return;

    setLoadingPwd(true);
    setPwdErrors({});

    try {
      const ok = await changePassword(passwords.current, passwords.new);
      if (!ok) {
        setPwdErrors({ current: "현재 비밀번호가 올바르지 않습니다." });
        return;
      }

      // 성공 시 입력값 초기화 -> 버튼 자동 비활성화
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      console.error("Failed to change password:", err);
      setPwdErrors({ current: "현재 비밀번호가 올바르지 않습니다." });
    } finally {
      setLoadingPwd(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteStep(1);
    setShowDeleteModal(true);
  };

  const proceedDeleteStep = () => {
    setDeleteStep(2);
  };

  const cancelDeleteFlow = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
  };

  const handleDeleteAccount = async () => {
    if (loadingDelete || !globalProfile) return;
    setLoadingDelete(true);
    try {
      const ok = await deleteUser();
      if (!ok) throw new Error("Delete failed");

      await logout();
      setShowDeleteModal(false);
      setDeleteStep(1);

      navigate("/", { replace: true });
      setTimeout(() => {
        window.location.replace("/");
      }, 400);
    } catch (err) {
      console.error("Failed to delete account:", err);
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-rose-500 text-white flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">개인정보 수정</h1>
            <p className="text-white/90 text-sm">프로필 정보를 관리하세요</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition"
            aria-label="닫기"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="w-full flex-1 overflow-y-auto">
        {/* Section: Profile Image */}
        <section className="w-full bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <header className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                프로필 사진
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                표시될 프로필 사진을 관리합니다.
              </p>
            </header>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-rose-500 flex items-center justify-center text-4xl font-bold text-white overflow-hidden shadow-inner">
                  {profile.profileImage ? (
                    <img
                      src={profile.profileImage}
                      alt="프로필 이미지"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span aria-hidden>{profile.name?.charAt(0) ?? "?"}</span>
                  )}
                </div>

                <label
                  className="absolute bottom-0 right-0 w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-rose-600 transition shadow-md border-2 border-white"
                  aria-label="프로필 이미지 업로드"
                >
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    aria-hidden="true"
                  />
                </label>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm text-gray-600 mb-2">
                  프로필 사진을 변경하려면 카메라 아이콘을 클릭하세요
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG 형식 / 최대 5MB (현재 로컬 미리보기만 지원)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Basic Info */}
        <section className="w-full bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <header className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                기본 정보
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                계정의 기본 정보를 수정합니다.
              </p>
            </header>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  이름
                </label>
                <input
                  id="name"
                  type="text"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, name: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  placeholder="이름을 입력하세요"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  이메일은 변경할 수 없습니다
                </p>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={!isProfileSavable || loadingSave}
                className="w-full mt-4 rounded-lg bg-rose-500 text-white px-4 py-3 text-sm font-semibold hover:bg-rose-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                aria-disabled={!isProfileSavable || loadingSave}
              >
                {loadingSave ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        </section>

        {/* Section: Password (필드별 에러, 버튼 활성/비활성 제어) */}
        <section className="w-full bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <header className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                비밀번호 변경
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                로그인 비밀번호를 새로 설정합니다.
              </p>
            </header>

            <div className="space-y-4">
              {/* 현재 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(e) => {
                    setPasswords((s) => ({ ...s, current: e.target.value }));
                    if (pwdErrors.current) {
                      setPwdErrors((prev) => ({ ...prev, current: undefined }));
                    }
                  }}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 ${
                    pwdErrors.current
                      ? "border-red-400 focus:ring-red-300"
                      : "border-gray-200 focus:ring-rose-300"
                  }`}
                  placeholder="현재 비밀번호를 입력하세요"
                />
                {pwdErrors.current && (
                  <p className="mt-1 text-xs text-red-600">
                    {pwdErrors.current}
                  </p>
                )}
              </div>

              {/* 새 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={passwords.new}
                  onChange={(e) => {
                    setPasswords((s) => ({ ...s, new: e.target.value }));
                    if (pwdErrors.new) {
                      setPwdErrors((prev) => ({ ...prev, new: undefined }));
                    }
                  }}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 ${
                    pwdErrors.new
                      ? "border-red-400 focus:ring-red-300"
                      : "border-gray-200 focus:ring-rose-300"
                  }`}
                  placeholder="새 비밀번호를 입력하세요 (8자 이상)"
                />
                {pwdErrors.new && (
                  <p className="mt-1 text-xs text-red-600">{pwdErrors.new}</p>
                )}
              </div>

              {/* 새 비밀번호 확인 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => {
                    setPasswords((s) => ({ ...s, confirm: e.target.value }));
                    if (pwdErrors.confirm) {
                      setPwdErrors((prev) => ({
                        ...prev,
                        confirm: undefined,
                      }));
                    }
                  }}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 ${
                    pwdErrors.confirm
                      ? "border-red-400 focus:ring-red-300"
                      : "border-gray-200 focus:ring-rose-300"
                  }`}
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
                {pwdErrors.confirm && (
                  <p className="mt-1 text-xs text-red-600">
                    {pwdErrors.confirm}
                  </p>
                )}
              </div>

              <button
                onClick={handleChangePassword}
                disabled={!isPwdFormFilled || loadingPwd}
                className="w-full mt-4 rounded-lg bg-rose-500 text-white px-4 py-3 text-sm font-semibold hover:bg-rose-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                aria-disabled={!isPwdFormFilled || loadingPwd}
              >
                {loadingPwd ? "변경 중..." : "비밀번호 변경"}
              </button>
            </div>
          </div>
        </section>

        {/* Section: Delete Account */}
        <section className="w-full bg-rose-50 border-b border-rose-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <header className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-rose-600 mb-1 sm:mb-2">
                회원 탈퇴
              </h2>
            </header>

            <p className="text-sm text-gray-600 mb-4">
              회원 탈퇴 시 모든 학습 데이터가 영구적으로 삭제되며 복구할 수
              없습니다.
            </p>

            <button
              onClick={openDeleteModal}
              className="w-full rounded-lg border border-rose-500 px-4 py-3 bg-white text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
              type="button"
            >
              회원 탈퇴하기
            </button>
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal: 중앙 배치 + 2단계 확인 */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 bg-rose-100">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>

            {deleteStep === 1 && (
              <>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2">
                  회원 탈퇴 안내
                </h3>
                <p className="text-sm text-gray-600 text-center mb-6">
                  모든 학습 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={cancelDeleteFlow}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                    type="button"
                    autoFocus
                  >
                    취소
                  </button>
                  <button
                    onClick={proceedDeleteStep}
                    className="flex-1 rounded-lg bg-rose-600 text-white px-4 py-3 text-sm font-semibold hover:bg-rose-700 transition"
                    type="button"
                  >
                    계속
                  </button>
                </div>
              </>
            )}

            {deleteStep === 2 && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 bg-rose-100">
                  <ShieldAlert className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2">
                  정말로 탈퇴하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600 text-center mb-6">
                  이 작업은 되돌릴 수 없습니다.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={cancelDeleteFlow}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                    type="button"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loadingDelete}
                    className="flex-1 rounded-lg bg-rose-600 text-white px-4 py-3 text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    type="button"
                    aria-disabled={loadingDelete}
                  >
                    {loadingDelete ? "탈퇴 진행중..." : "최종 탈퇴"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPageProfile;
