import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { postAPI } from "../api/post";
import { awsAPI } from "../api/aws";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import "./PostEdit.css";

/**
 * 게시글 수정 페이지 컴포넌트
 * 기존 게시글을 수정하고 이미지를 추가/삭제할 수 있는 페이지
 */
const PostEdit = () => {
  const { id } = useParams(); // URL 파라미터에서 게시글 ID 가져오기
  const navigate = useNavigate(); // 페이지 네비게이션을 위한 훅
  const { user, loading: authLoading } = useAuth(); // 인증 정보 및 로딩 상태
  const fileInputRef = useRef(null); // 파일 input 요소에 대한 참조

  // 폼 데이터 상태 관리
  const [formData, setFormData] = useState({
    title: "", // 게시글 제목
    category: 1, // 카테고리 ID (기본값: 1 = IT)
    context: "", // 게시글 내용
  });

  const [error, setError] = useState(""); // 에러 메시지 상태
  const [loading, setLoading] = useState(true); // 게시글 로딩 중 상태
  const [submitting, setSubmitting] = useState(false); // 게시글 수정 제출 중 상태
  const [existingImages, setExistingImages] = useState([]); // 기존에 업로드된 이미지 URL 배열
  const [imageFiles, setImageFiles] = useState([]); // 새로 추가할 이미지 파일 객체 배열
  const [imagePreviews, setImagePreviews] = useState([]); // 새로 추가한 이미지의 미리보기 URL 배열
  const [uploadingImages, setUploadingImages] = useState(false); // 이미지 업로드 중 상태
  const [originalCategoryId, setOriginalCategoryId] = useState(null); // 원래 카테고리 ID 저장 (현재는 사용 안 함)

  /**
   * 컴포넌트 마운트 시 게시글 데이터 로드
   * 인증 확인 및 권한 검사 후 게시글 정보를 불러와 폼에 설정
   */
  useEffect(() => {
    let isMounted = true; // 컴포넌트가 마운트되어 있는지 추적
    const abortController = new AbortController(); // 비동기 작업 취소를 위한 컨트롤러

    // 인증 로딩이 완료될 때까지 대기
    if (authLoading) {
      return;
    }

    // 로그인 확인 - localStorage에서 토큰 확인
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      if (isMounted) {
        setError("로그인이 필요합니다.");
        setTimeout(() => {
          navigate("/login"); // 로그인 페이지로 리다이렉트
        }, 1500);
        setLoading(false);
      }
      return;
    }

    /**
     * 게시글 데이터를 불러와서 폼에 설정하는 함수
     */
    const loadPost = async () => {
      try {
        setLoading(true);
        // 게시글 상세 정보 API 호출
        const post = await postAPI.getPost(id);

        // 컴포넌트가 언마운트되었거나 요청이 취소된 경우 종료
        if (abortController.signal.aborted || !isMounted) return;

        console.log("수정할 게시글 정보:", post);

        // 게시글 작성자 확인 (다양한 필드명 대응)
        const postAuthor =
          post.user || post.authorName || post.writer || post.username;
        // 현재 로그인한 사용자 확인 (다양한 필드명 대응)
        const currentUser =
          user?.username || user?.nickName || user?.email || user?.user;

        console.log("권한 확인:", {
          postAuthor,
          currentUser,
          isMatch: postAuthor === currentUser,
        });

        // 작성자가 아니면 권한 없음 메시지 표시하고 상세 페이지로 리다이렉트
        if (postAuthor && currentUser && postAuthor !== currentUser) {
          if (isMounted) {
            setError("본인이 작성한 게시글만 수정할 수 있습니다.");
            setTimeout(() => {
              navigate(`/posts/${id}`);
            }, 2000);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          // 카테고리 이름을 ID로 변환하는 매핑 객체
          const categoryNameToId = {
            IT: 1,
            게임: 2,
            주식: 3,
            스포츠: 4,
          };

          // 카테고리 ID 찾기 (다양한 형태의 카테고리 데이터 대응)
          let categoryId = 1; // 기본값
          if (post.categoryId) {
            // categoryId 필드가 있는 경우
            categoryId = post.categoryId;
          } else if (post.category?.id) {
            // category 객체의 id 필드가 있는 경우
            categoryId = post.category.id;
          } else if (typeof post.category === "string") {
            // 카테고리가 문자열인 경우 (예: "IT", "게임")
            categoryId = categoryNameToId[post.category] || 1;
          } else if (typeof post.category === "number") {
            // 카테고리가 숫자인 경우
            categoryId = post.category;
          }

          setOriginalCategoryId(categoryId); // 원래 카테고리 ID 저장

          // 폼 데이터 설정
          setFormData({
            title: post.title || "",
            category: categoryId,
            context: post.context || post.content || "", // context 또는 content 필드 사용
          });

          // 기존 이미지 URL 배열 설정
          if (post.imageUrl && Array.isArray(post.imageUrl)) {
            setExistingImages(post.imageUrl);
          }
          setLoading(false);
        }
      } catch (error) {
        // 컴포넌트가 언마운트되었거나 요청이 취소된 경우 종료
        if (abortController.signal.aborted || !isMounted) return;

        console.error("게시글 불러오기 실패:", error);
        console.error("에러 상세:", error.response?.data);

        // 403 에러인 경우 권한 없음 처리
        if (error.response?.status === 403) {
          setError(
            "권한이 없습니다. 본인이 작성한 게시글만 수정할 수 있습니다."
          );
          setTimeout(() => {
            navigate(`/posts/${id}`);
          }, 2000);
        } else {
          setError("게시글을 불러오는데 실패했습니다.");
        }
        setLoading(false);
      }
    };

    loadPost(); // 게시글 로드 함수 실행

    // 컴포넌트 언마운트 시 정리 작업
    return () => {
      isMounted = false; // 마운트 상태를 false로 설정
      abortController.abort(); // 진행 중인 비동기 작업 취소
    };
  }, [id, user, authLoading, navigate]); // 의존성 배열: id, user, authLoading, navigate가 변경될 때마다 실행

  /**
   * 폼 입력 필드 변경 핸들러
   * @param {Event} e - 입력 이벤트 객체
   */
  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value, // 동적으로 필드명에 맞는 값 업데이트
    });
    setError(""); // 에러 메시지 초기화
  };

  /**
   * 새 이미지 파일 선택 핸들러
   * 여러 번 파일을 선택해도 이전 파일들이 유지되도록 누적 저장
   * @param {Event} e - 파일 input 변경 이벤트
   */
  const handleImageChange = e => {
    const files = Array.from(e.target.files); // FileList를 배열로 변환
    if (files.length === 0) return; // 파일이 없으면 종료

    // 이미지 파일만 필터링 (MIME 타입으로 확인)
    const imageFiles = files.filter(file => file.type.startsWith("image/"));

    // 이미지가 아닌 파일이 포함된 경우 에러 표시
    if (imageFiles.length !== files.length) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }

    // 각 파일에 대해 미리보기 URL 생성 (Blob URL)
    const previews = imageFiles.map(file => URL.createObjectURL(file));

    // 기존 파일 배열에 새로 선택한 파일들 추가 (누적)
    setImageFiles(prev => [...prev, ...imageFiles]);
    // 기존 미리보기 배열에 새 미리보기 URL들 추가
    setImagePreviews(prev => [...prev, ...previews]);
    setError(""); // 에러 메시지 초기화

    // 파일 input 초기화 (같은 파일을 다시 선택할 수 있도록)
    // 주의: 이렇게 하면 input은 비워지지만, state에는 파일들이 누적됨
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * 기존 이미지 제거 핸들러
   * @param {number} index - 제거할 이미지의 인덱스
   */
  const removeExistingImage = index => {
    // 해당 인덱스의 기존 이미지 URL 제거
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * 새로 추가한 이미지 제거 핸들러
   * @param {number} index - 제거할 이미지의 인덱스
   */
  const removeNewImage = index => {
    // 해당 인덱스의 파일 제거
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      // Blob URL 메모리 해제 (메모리 누수 방지)
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    // 파일 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * 게시글 수정 제출 핸들러
   * 폼 유효성 검사 후 기존 이미지 유지 및 새 이미지 업로드, 게시글 수정 API 호출
   * @param {Event} e - 폼 제출 이벤트
   */
  const handleSubmit = async e => {
    e.preventDefault(); // 기본 폼 제출 동작 방지

    // 제목과 내용이 비어있는지 확인
    if (!formData.title.trim() || !formData.context.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }

    // 로그인 확인 - localStorage에서 토큰 확인
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setError("로그인이 필요합니다.");
      setTimeout(() => {
        navigate("/login"); // 로그인 페이지로 리다이렉트
      }, 1500);
      return;
    }

    setSubmitting(true); // 게시글 수정 로딩 시작
    setUploadingImages(true); // 이미지 업로드 로딩 시작
    setError(""); // 에러 메시지 초기화

    try {
      // 기존 이미지 URL 배열 복사 (기존 이미지 유지)
      let imageUrls = [...existingImages];

      // 새로 추가한 이미지가 있으면 AWS S3에 업로드
      if (imageFiles.length > 0) {
        try {
          // 모든 새 이미지 파일을 한 번에 업로드
          const newImageUrls = await awsAPI.uploadImages(imageFiles);
          // 기존 이미지 URL 배열에 새로 업로드된 이미지 URL들 추가
          imageUrls = [...imageUrls, ...newImageUrls];
        } catch (uploadError) {
          console.error("이미지 업로드 실패:", uploadError);
          setError("이미지 업로드에 실패했습니다.");
          setUploadingImages(false);
          setSubmitting(false);
          return; // 업로드 실패 시 게시글 수정 중단
        }
      }

      console.log("수정 요청 데이터:", {
        id,
        title: formData.title,
        category: formData.category,
        context: formData.context,
        imageUrls,
      });
      console.log("현재 사용자 정보:", user);
      console.log("토큰 존재 여부:", !!accessToken);

      // 게시글 수정 API 호출
      const result = await postAPI.updatePost(
        id, // 게시글 ID
        formData.title, // 제목
        parseInt(formData.category), // 카테고리 ID (숫자로 변환)
        formData.context, // 내용
        imageUrls // 기존 + 새로 업로드된 이미지 URL 배열
      );
      console.log("수정 성공:", result);

      // 미리보기 URL 정리 (메모리 누수 방지)
      imagePreviews.forEach(url => URL.revokeObjectURL(url));

      // 게시글 상세 페이지로 이동
      navigate(`/posts/${id}`);
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      console.error("에러 응답:", error.response);
      console.error("에러 상태:", error.response?.status);
      console.error("에러 상세:", error.response?.data);

      let errorMessage = "게시글 수정에 실패했습니다.";

      // HTTP 상태 코드에 따른 에러 메시지 설정
      if (error.response?.status === 403) {
        // 403: 권한 없음 - 본인이 작성한 게시글만 수정 가능
        errorMessage =
          "권한이 없습니다. 본인이 작성한 게시글만 수정할 수 있습니다.";
      } else if (error.response?.status === 401) {
        // 401: 인증 실패 - 로그인 필요
        errorMessage = "로그인이 필요합니다. 다시 로그인해주세요.";
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        // 기타 에러 - 서버에서 전달된 메시지 사용 또는 기본 메시지
        errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "게시글 수정에 실패했습니다.";
      }

      setError(errorMessage);
    } finally {
      // 로딩 상태 해제
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  // 게시글 로딩 중일 때 로딩 화면 표시
  if (loading) {
    return (
      <Layout>
        <div className="loading">로딩 중...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="post-edit-container">
        <div className="post-edit-card">
          <h1 className="post-edit-title">게시글 수정</h1>
          {/* 게시글 수정 폼 */}
          <form onSubmit={handleSubmit} className="post-edit-form">
            {/* 제목 입력 필드 */}
            <Input
              label="제목"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="제목을 입력하세요"
              required
              disabled={submitting}
            />
            {/* 카테고리 선택 필드 */}
            <div className="form-group">
              <label className="form-label">
                카테고리
                <span className="required">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="select-input"
                disabled={submitting}
              >
                <option value={1}>IT</option>
                <option value={2}>게임</option>
                <option value={3}>주식</option>
                <option value={4}>스포츠</option>
              </select>
            </div>
            {/* 내용 입력 필드 */}
            <Textarea
              label="내용"
              name="context"
              value={formData.context}
              onChange={handleChange}
              placeholder="내용을 입력하세요"
              rows={15}
              required
              disabled={submitting}
            />

            {/* 이미지 업로드 섹션 */}
            <div className="form-group">
              <label className="form-label">
                이미지
                {/* 총 이미지 갯수 표시 (기존 이미지 + 새로 추가한 이미지) */}
                {(existingImages.length > 0 || imagePreviews.length > 0) && (
                  <span className="image-count">
                    ({existingImages.length + imagePreviews.length}개)
                  </span>
                )}
              </label>

              {/* 기존 이미지 표시 섹션 */}
              {existingImages.length > 0 && (
                <div className="existing-images-container">
                  <div className="existing-images-label">
                    기존 이미지 ({existingImages.length}개)
                  </div>
                  <div className="image-preview-container">
                    {existingImages.map((url, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={url} alt={`기존 이미지 ${index + 1}`} />
                        {/* 기존 이미지 제거 버튼 */}
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="remove-image-btn"
                          disabled={submitting || uploadingImages}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 새 이미지 추가 input - 숨김 처리하고 커스텀 버튼으로 트리거 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*" // 이미지 파일만 선택 가능
                multiple // 여러 파일 동시 선택 가능
                onChange={handleImageChange} // 파일 선택 시 핸들러 호출
                disabled={submitting || uploadingImages} // 로딩 중에는 비활성화
                className="file-input-hidden"
                id="file-input-edit"
              />
              {/* 커스텀 파일 선택 버튼 */}
              <label
                htmlFor="file-input-edit"
                className="file-input-label"
                style={{
                  pointerEvents: submitting || uploadingImages ? "none" : "auto",
                  opacity: submitting || uploadingImages ? 0.6 : 1,
                }}
              >
                파일 선택
              </label>

              {/* 새로 추가한 이미지 미리보기 표시 섹션 */}
              {imagePreviews.length > 0 && (
                <div className="new-images-container">
                  <div className="new-images-label">
                    추가할 이미지 ({imagePreviews.length}개)
                  </div>
                  <div className="image-preview-container">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={preview} alt={`새 이미지 ${index + 1}`} />
                        {/* 새 이미지 제거 버튼 */}
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="remove-image-btn"
                          disabled={submitting || uploadingImages}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 에러 메시지 표시 */}
            {error && <div className="error-message">{error}</div>}
            {/* 이미지 업로드 중 메시지 표시 */}
            {uploadingImages && (
              <div className="uploading-message">이미지 업로드 중...</div>
            )}
            {/* 폼 액션 버튼들 */}
            <div className="form-actions">
              {/* 취소 버튼 - 게시글 상세 페이지로 이동 */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/posts/${id}`)}
                disabled={submitting}
              >
                취소
              </Button>
              {/* 수정하기 버튼 - 폼 제출 */}
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "수정 중..." : "수정하기"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default PostEdit;
