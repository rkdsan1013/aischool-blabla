// frontend/src/pages/MyPageProfile.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  AlertTriangle,
  ShieldAlert,
  ChevronLeft,
  Save,
  Lock,
  User,
  Trash2,
} from "lucide-react";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
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

  const isProfileSavable =
    profile.name.trim().length > 0 &&
    (profile.name.trim() !== (globalProfile?.name || "").trim() ||
      profile.profileImage !== globalProfile?.profile_img);

  const handleSaveProfile = async () => {
    if (loadingSave || !globalProfile || !isProfileSavable) return;
    setLoadingSave(true);
    try {
      const updated = await updateUserProfile({
        name: profile.name.trim(),
        profile_img: profile.profileImage,
      });
      if (!updated) throw new Error("Update failed");
      await refreshProfile();
      alert("프로필이 저장되었습니다.");
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("프로필 저장에 실패했습니다.");
    } finally {
      setLoadingSave(false);
    }
  };

  const validateNewPassword = (): boolean => {
    const errors: PasswordErrors = {};
    if (!passwords.current.trim())
      errors.current = "현재 비밀번호를 입력하세요.";
    if (passwords.new.length < 8)
      errors.new = "새 비밀번호는 최소 8자 이상이어야 합니다.";
    if (!passwords.confirm.trim())
      errors.confirm = "새 비밀번호를 다시 입력하세요.";
    else if (passwords.new !== passwords.confirm)
      errors.confirm = "새 비밀번호가 일치하지 않습니다.";
    setPwdErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
      setPasswords({ current: "", new: "", confirm: "" });
      alert("비밀번호가 변경되었습니다.");
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
      setTimeout(() => window.location.replace("/"), 400);
    } catch (err) {
      console.error("Failed to delete account:", err);
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-20">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              프로필 수정
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-center mb-8">
              {/* Profile Image Area - Modified Style */}
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gray-50 flex items-center justify-center text-4xl font-bold text-gray-300 overflow-hidden border border-gray-200 shadow-sm">
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

                {/* Camera Button - Clean White Style */}
                <label
                  className="absolute bottom-1 right-1 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center cursor-pointer border border-gray-200 shadow-md hover:border-rose-200 hover:text-rose-500 text-gray-500 transition-all duration-200 group-hover:scale-105"
                  aria-label="프로필 이미지 업로드"
                >
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    aria-hidden="true"
                  />
                </label>
              </div>
              <p className="mt-3 text-sm text-gray-400 font-medium">
                프로필 사진 변경
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-bold text-gray-700 mb-1.5 ml-1"
                >
                  이름
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full rounded-2xl bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    placeholder="이름을 입력하세요"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-gray-700 mb-1.5 ml-1"
                >
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full rounded-2xl bg-gray-100 border border-gray-200 px-4 py-3.5 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={!isProfileSavable || loadingSave}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500 text-white px-4 py-3.5 text-sm font-bold shadow-md shadow-rose-200 hover:bg-rose-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  type="button"
                >
                  <Save className="w-4 h-4" />
                  {loadingSave ? "저장 중..." : "변경사항 저장"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-gray-900">비밀번호 변경</h2>
            </div>
            <div className="space-y-4">
              <div>
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(e) => {
                    setPasswords((s) => ({ ...s, current: e.target.value }));
                    if (pwdErrors.current)
                      setPwdErrors((prev) => ({ ...prev, current: undefined }));
                  }}
                  className={`w-full rounded-2xl bg-gray-50 border px-4 py-3.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                    pwdErrors.current
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:border-rose-500 focus:ring-rose-500/20"
                  }`}
                  placeholder="현재 비밀번호"
                />
                {pwdErrors.current && (
                  <p className="mt-1.5 text-xs text-red-500 ml-1 font-medium">
                    {pwdErrors.current}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  value={passwords.new}
                  onChange={(e) => {
                    setPasswords((s) => ({ ...s, new: e.target.value }));
                    if (pwdErrors.new)
                      setPwdErrors((prev) => ({ ...prev, new: undefined }));
                  }}
                  className={`w-full rounded-2xl bg-gray-50 border px-4 py-3.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                    pwdErrors.new
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:border-rose-500 focus:ring-rose-500/20"
                  }`}
                  placeholder="새 비밀번호 (8자 이상)"
                />
                {pwdErrors.new && (
                  <p className="mt-1.5 text-xs text-red-500 ml-1 font-medium">
                    {pwdErrors.new}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => {
                    setPasswords((s) => ({ ...s, confirm: e.target.value }));
                    if (pwdErrors.confirm)
                      setPwdErrors((prev) => ({ ...prev, confirm: undefined }));
                  }}
                  className={`w-full rounded-2xl bg-gray-50 border px-4 py-3.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                    pwdErrors.confirm
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:border-rose-500 focus:ring-rose-500/20"
                  }`}
                  placeholder="새 비밀번호 확인"
                />
                {pwdErrors.confirm && (
                  <p className="mt-1.5 text-xs text-red-500 ml-1 font-medium">
                    {pwdErrors.confirm}
                  </p>
                )}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={!isPwdFormFilled || loadingPwd}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-3.5 text-sm font-bold shadow-md hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  type="button"
                >
                  {loadingPwd ? "변경 중..." : "비밀번호 변경"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-red-50/50 rounded-3xl border border-red-100 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-2xl text-red-500 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                회원 탈퇴
              </h2>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                탈퇴 시 모든 학습 데이터와 기록이 영구적으로 삭제되며, 복구할 수
                없습니다. 신중하게 결정해주세요.
              </p>
              <button
                onClick={openDeleteModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-all active:scale-[0.98]"
                type="button"
              >
                <Trash2 className="w-4 h-4" />
                회원 탈퇴하기
              </button>
            </div>
          </div>
        </section>
      </main>

      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-scale-in">
            {deleteStep === 1 && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5 bg-red-50 text-red-500">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  정말 탈퇴하시겠어요?
                </h3>
                <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
                  지금까지 쌓아온 학습 기록이
                  <br />
                  모두 사라지게 됩니다.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelDeleteFlow}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3.5 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition active:scale-[0.98]"
                    type="button"
                  >
                    취소
                  </button>
                  <button
                    onClick={proceedDeleteStep}
                    className="flex-1 rounded-xl bg-red-500 text-white px-4 py-3.5 text-sm font-bold hover:bg-red-600 transition active:scale-[0.98] shadow-md shadow-red-100"
                    type="button"
                  >
                    계속 진행
                  </button>
                </div>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5 bg-gray-100 text-gray-600">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  마지막 확인
                </h3>
                <p className="text-sm text-gray-500 text-center mb-8">
                  탈퇴 후에는 계정을 복구할 수 없습니다.
                  <br />
                  그래도 탈퇴하시겠습니까?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelDeleteFlow}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3.5 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition active:scale-[0.98]"
                    type="button"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loadingDelete}
                    className="flex-1 rounded-xl bg-gray-900 text-white px-4 py-3.5 text-sm font-bold hover:bg-black transition active:scale-[0.98] shadow-lg disabled:opacity-50"
                    type="button"
                  >
                    {loadingDelete ? "처리 중..." : "확인 (탈퇴)"}
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
