import React, { useState, useEffect } from 'react';
import { Book, GraduationCap, ArrowLeft, CheckCircle, RefreshCw, LogIn, FileText, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { googleSignIn, getAccessToken, initAuth, logout, AppUser } from '../auth';

interface Course {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  courseState: string;
}

interface CourseWork {
  id: string;
  title: string;
  description?: string;
  maxPoints?: number;
  workType: string;
}

interface StudentSubmission {
  id: string;
  userId: string;
  state: string;
  assignedGrade?: number;
  draftGrade?: number;
}

export function ClassroomPanel() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<{ code?: string; message: string; isDomainError?: boolean } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseWork, setCourseWork] = useState<CourseWork[]>([]);
  const [selectedWork, setSelectedWork] = useState<CourseWork | null>(null);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);

  // We map userId to student profile for display
  const [studentProfiles, setStudentProfiles] = useState<Record<string, {name: string, email: string}>>({});

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setNeedsAuth(false);
        setAuthError(null);
        fetchCourses(token);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchCourses = async (token?: string | null) => {
    try {
      setLoading(true);
      const t = token || await getAccessToken();
      if (!t) throw new Error('No token');
      const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (e) {
      console.error('Lỗi khi tải khóa học', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseWork = async (courseId: string) => {
    try {
      setLoading(true);
      const t = await getAccessToken();
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      setCourseWork(data.courseWork || []);
    } catch (e) {
      console.error('Lỗi khi tải bài tập', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (courseId: string, courseworkId: string) => {
    try {
      setLoading(true);
      const t = await getAccessToken();
      
      // Fetch submissions
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseworkId}/studentSubmissions`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      setSubmissions(data.studentSubmissions || []);

      // Also fetch students in the course to resolve names
      const studentsRes = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const studentsData = await studentsRes.json();
      const profiles: Record<string, any> = {};
      (studentsData.students || []).forEach((s: any) => {
        profiles[s.userId] = {
          name: s.profile?.name?.fullName || 'Học viên ẩn danh',
          email: s.profile?.emailAddress || ''
        };
      });
      setStudentProfiles(profiles);

    } catch (e) {
      console.error('Lỗi khi tải bài nộp', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGrade = async (sub: StudentSubmission, draftGrade: string) => {
    try {
      if (!draftGrade || isNaN(Number(draftGrade))) return;
      const confirmed = window.confirm(`Cập nhật điểm thành ${draftGrade}? Điểm này sẽ lưu là bản nháp.`);
      if (!confirmed) return;

      const t = await getAccessToken();
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${selectedCourse?.id}/courseWork/${selectedWork?.id}/studentSubmissions/${sub.id}?updateMask=draftGrade`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          draftGrade: Number(draftGrade)
        })
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      // Refresh submissions
      if (selectedCourse && selectedWork) {
        fetchSubmissions(selectedCourse.id, selectedWork.id);
      }
    } catch (e) {
      console.error('Lỗi khi cập nhật điểm:', e);
      alert('Không thể cập nhật điểm. Kiểm tra quyền hoặc thử lại sau.');
    }
  };

  const handleLogin = () => {
    setAuthError(null);
    setIsLoggingIn(true);
    googleSignIn()
      .then(result => {
        if (result) {
          setUser(result.user);
          setNeedsAuth(false);
          fetchCourses(result.accessToken);
        }
      })
      .catch((e: any) => {
        console.error('Login error details:', e);
        const errorCode = e?.code || e?.error || '';
        const errorMessage = e?.message || '';

        if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'popup_closed_by_user') {
          // User closed popup deliberately
          setAuthError(null);
        } else if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain') || errorMessage.includes('authorized domain')) {
          setAuthError({
            code: 'auth/unauthorized-domain',
            message: `Tên miền ${window.location.hostname} chưa được thêm vào Danh sách miền được ủy quyền (Authorized Domains) trong Firebase Console.`,
            isDomainError: true
          });
        } else if (errorCode === 'auth/popup-blocked' || errorCode === 'popup_blocked_by_browser') {
          setAuthError({
            code: 'auth/popup-blocked',
            message: 'Cửa sổ đăng nhập (popup) đã bị trình duyệt chặn. Vui lòng cho phép popup trên thanh địa chỉ của trình duyệt hoặc nhấn nút Thử lại.'
          });
        } else {
          setAuthError({
            code: errorCode || 'auth/unknown',
            message: errorMessage || 'Không thể mở cửa sổ đăng nhập hoặc xác thực thất bại. Vui lòng thử lại.'
          });
        }
      })
      .finally(() => {
        setIsLoggingIn(false);
      });
  };

  const copyCurrentDomain = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  if (needsAuth) {
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-lg mx-auto my-auto p-4 sm:p-6">
        <div className="w-full bg-white rounded-2xl shadow-sm border border-[#E2E2D8] p-6 sm:p-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-[#F5F5F0] flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-[#5A5A40]" />
          </div>
          <h2 className="text-xl font-bold text-[#3C3633] mb-2">Hệ thống Giáo dục & Chấm điểm</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            Đăng nhập tài khoản Google để đồng bộ dữ liệu với Google Classroom và tiến hành quản lý lớp học, chấm điểm học viên.
          </p>

          {authError && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left text-xs sm:text-sm text-amber-900 animate-fadeIn">
              <div className="flex items-start gap-2.5 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 mb-1">
                    {authError.isDomainError ? 'Cần cấp phép tên miền trên Firebase' : 'Thông báo đăng nhập'}
                  </h4>
                  <p className="text-amber-800 leading-relaxed">{authError.message}</p>
                </div>
              </div>

              {authError.isDomainError && (
                <div className="mt-3 pt-3 border-t border-amber-200/60 text-xs space-y-2">
                  <p className="font-medium text-amber-900">Cách xử lý trên Firebase Console:</p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-800">
                    <li>Vào <b>Firebase Console</b> &rarr; <b>Authentication</b> &rarr; <b>Settings</b> &rarr; <b>Authorized domains</b></li>
                    <li>Bấm <b>Add domain</b> và dán tên miền:</li>
                  </ol>
                  <div className="flex items-center gap-2 mt-1.5 bg-white/80 border border-amber-300 rounded-md p-2">
                    <code className="font-mono text-amber-950 flex-1 truncate font-semibold">{currentHost}</code>
                    <button
                      type="button"
                      onClick={copyCurrentDomain}
                      className="px-2.5 py-1 bg-[#5A5A40] text-white rounded text-[11px] font-medium flex items-center gap-1 hover:bg-[#4A4A35] transition-colors shrink-0"
                    >
                      {copiedDomain ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDomain ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl px-6 py-3.5 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all font-medium text-gray-700 disabled:opacity-50"
          >
            {isLoggingIn ? (
              <>
                <RefreshCw className="w-5 h-5 text-[#5A5A40] animate-spin" />
                <span>Đang kết nối Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>Đăng nhập với Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E2D8] flex flex-col h-full overflow-hidden w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-4 bg-[#5A5A40] text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          {selectedCourse ? (
            <button 
              onClick={() => {
                if (selectedWork) {
                  setSelectedWork(null);
                  setSubmissions([]);
                } else {
                  setSelectedCourse(null);
                  setCourseWork([]);
                }
              }} 
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Book className="w-6 h-6 opacity-80" />
          )}
          <div>
            <h2 className="font-bold text-lg">
              {selectedWork ? 'Chấm điểm' : (selectedCourse ? selectedCourse.name : 'Danh sách Lớp học')}
            </h2>
            {selectedWork && <p className="text-xs opacity-80">{selectedWork.title}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium opacity-90 hidden sm:inline">{user?.displayName}</span>
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="User" 
              className="w-8 h-8 rounded-full border border-white/30" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white border border-white/30">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <button onClick={logout} className="text-xs hover:underline opacity-80 ml-2">Đăng xuất</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F9F9F7]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40">
            <RefreshCw className="w-8 h-8 text-[#5A5A40] animate-spin mb-2 opacity-50" />
            <p className="text-sm text-gray-500">Đang đồng bộ dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* 1. Course List */}
            {!selectedCourse && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.length === 0 ? (
                  <p className="text-gray-500 col-span-full text-center py-8">Bạn không có lớp học nào trên Google Classroom.</p>
                ) : (
                  courses.map(course => (
                    <div 
                      key={course.id} 
                      onClick={() => {
                        setSelectedCourse(course);
                        fetchCourseWork(course.id);
                      }}
                      className="bg-white border border-[#E2E2D8] rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-[#5A5A40] transition-all group"
                    >
                      <h3 className="font-bold text-lg text-[#3C3633] mb-1 group-hover:text-[#5A5A40] line-clamp-1">{course.name}</h3>
                      <p className="text-sm text-gray-500 mb-4">{course.section || 'Chưa có phân ban'}</p>
                      <div className="flex items-center text-xs text-blue-600 font-semibold uppercase tracking-wide">
                        <GraduationCap className="w-4 h-4 mr-1" />
                        Quản lý lớp học
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 2. Coursework List */}
            {selectedCourse && !selectedWork && (
              <div className="space-y-3 max-w-3xl mx-auto">
                <h3 className="font-bold text-[#3C3633] mb-4 flex justify-between items-center">
                  <span>Bài tập / Nhiệm vụ</span>
                  <span className="text-sm font-normal text-gray-500">{courseWork.length} bài</span>
                </h3>
                {courseWork.length === 0 ? (
                  <div className="bg-white rounded-lg border border-[#E2E2D8] p-8 text-center text-gray-500">
                    Lớp học này chưa có bài tập nào.
                  </div>
                ) : (
                  courseWork.map(work => (
                    <div 
                      key={work.id}
                      onClick={() => {
                        setSelectedWork(work);
                        fetchSubmissions(selectedCourse.id, work.id);
                      }}
                      className="bg-white border border-[#E2E2D8] rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-[#5A5A40] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#E2E2D8] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-[#5A5A40]" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#3C3633] text-sm md:text-base">{work.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">Điểm tối đa: {work.maxPoints || 100}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#5A5A40] bg-[#F5F5F0] px-3 py-1 rounded-full whitespace-nowrap">
                        Chấm điểm
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. Submissions / Grading UI */}
            {selectedCourse && selectedWork && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg border border-[#E2E2D8] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#E2E2D8] text-[#5A5A40] text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Học viên</th>
                        <th className="p-4">Trạng thái</th>
                        <th className="p-4 text-center">Điểm tối đa ({selectedWork.maxPoints || 100})</th>
                        <th className="p-4 w-32">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E2D8]">
                      {submissions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-sm text-gray-500">Chưa có dữ liệu bài nộp.</td>
                        </tr>
                      ) : (
                        submissions.map(sub => {
                          const profile = studentProfiles[sub.userId] || { name: 'Đang tải...' };
                          return (
                            <tr key={sub.id} className="hover:bg-gray-50">
                              <td className="p-4">
                                <p className="font-bold text-sm text-[#3C3633]">{profile.name}</p>
                                <p className="text-xs text-gray-500">{sub.userId}</p>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                                  sub.state === 'TURNED_IN' ? 'bg-green-100 text-green-700' :
                                  sub.state === 'RETURNED' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {sub.state === 'TURNED_IN' ? 'Đã nộp' : sub.state === 'RETURNED' ? 'Đã trả bài' : 'Chưa nộp / Đang giao'}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="inline-flex flex-col items-center gap-1">
                                  {sub.assignedGrade !== undefined ? (
                                    <span className="font-bold text-lg text-green-600">{sub.assignedGrade}</span>
                                  ) : sub.draftGrade !== undefined ? (
                                    <span className="font-bold text-lg text-yellow-600">{sub.draftGrade} (Nháp)</span>
                                  ) : (
                                    <span className="text-gray-400 text-sm italic">Chưa chấm</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <form 
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const val = (e.currentTarget.elements.namedItem('grade') as HTMLInputElement).value;
                                    handleUpdateGrade(sub, val);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <input 
                                    name="grade" 
                                    type="number" 
                                    min="0" 
                                    max={selectedWork.maxPoints || 100}
                                    defaultValue={sub.draftGrade || sub.assignedGrade || ''}
                                    className="w-16 p-1.5 text-sm border border-gray-300 rounded text-center focus:outline-none focus:border-[#5A5A40]" 
                                    placeholder="Điểm"
                                  />
                                  <button type="submit" className="p-1.5 text-white bg-[#5A5A40] rounded hover:bg-[#3C3633] transition-colors" title="Lưu điểm">
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                </form>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
