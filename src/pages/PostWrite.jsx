import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { postAPI } from "../api/post";
import { awsAPI } from "../api/aws";
import Layout from "../components/Layout";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import "./PostWrite.css";

/**
 * 게시글 작성 페이지 컴포넌트
 * 사용자가 새로운 게시글을 작성하고 이미지를 첨부할 수 있는 페이지
 */
const PostWrite = () => {
  const navigate = useNavigate(); // 페이지 네비게이션을 위한 훅
  const fileInputRef = useRef(null); // 파일 input 요소에 대한 참조

  // 폼 데이터 상태 관리
  const [formData, setFormData] = useState({
    title: "", // 게시글 제목
    category: 1, // 카테고리 ID (기본값: 1 = IT)
    context: "", // 게시글 내용
  });

  const [error, setError] = useState(""); // 에러 메시지 상태
  const [loading, setLoading] = useState(false); // 게시글 작성 중 로딩 상태
  const [imageFiles, setImageFiles] = useState([]); // 선택된 이미지 파일 객체 배열
  const [imagePreviews, setImagePreviews] = useState([]); // 이미지 미리보기 URL 배열
  const [uploadingImages, setUploadingImages] = useState(false); // 이미지 업로드 중 상태

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
   * 이미지 파일 선택 핸들러
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
   * 이미지 제거 핸들러
   * @param {number} index - 제거할 이미지의 인덱스
   */
  const removeImage = index => {
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
   * 게시글 작성 제출 핸들러
   * 폼 유효성 검사 후 이미지 업로드 및 게시글 작성 API 호출
   * @param {Event} e - 폼 제출 이벤트
   */
  const handleSubmit = async e => {
    e.preventDefault(); // 기본 폼 제출 동작 방지

    // 제목과 내용이 비어있는지 확인
    if (!formData.title.trim() || !formData.context.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }

    setLoading(true); // 게시글 작성 로딩 시작
    setUploadingImages(true); // 이미지 업로드 로딩 시작

    try {
      let imageUrls = []; // 업로드된 이미지 URL 배열

      // 선택된 이미지가 있으면 AWS S3에 업로드
      if (imageFiles.length > 0) {
        try {
          // 모든 이미지 파일을 한 번에 업로드
          imageUrls = await awsAPI.uploadImages(imageFiles);
        } catch (uploadError) {
          console.error("이미지 업로드 실패:", uploadError);
          setError("이미지 업로드에 실패했습니다.");
          setUploadingImages(false);
          setLoading(false);
          return; // 업로드 실패 시 게시글 작성 중단
        }
      }

      // 게시글 작성 API 호출
      await postAPI.createPost(
        formData.title, // 제목
        parseInt(formData.category), // 카테고리 ID (숫자로 변환)
        formData.context, // 내용
        imageUrls // 업로드된 이미지 URL 배열
      );

      // 미리보기 URL 정리 (메모리 누수 방지)
      imagePreviews.forEach(url => URL.revokeObjectURL(url));

      // 게시글 목록 페이지로 이동
      navigate("/posts");
    } catch (error) {
      // 게시글 작성 실패 시 에러 메시지 표시
      setError("게시글 작성에 실패했습니다.");
      console.error(error);
    } finally {
      // 로딩 상태 해제
      setLoading(false);
      setUploadingImages(false);
    }
  };

  return (
    <Layout>
      <div className="post-write-container">
        <div className="post-write-card">
          <h1 className="post-write-title">게시글 작성</h1>
          {/* 게시글 작성 폼 */}
          <form onSubmit={handleSubmit} className="post-write-form">
            {/* 제목 입력 필드 */}
            <Input
              label="제목"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="제목을 입력하세요"
              required
              disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
            />

            {/* 이미지 업로드 섹션 */}
            <div className="form-group">
              <label className="form-label">
                이미지
                {/* 총 선택된 이미지 갯수 표시 (여러 번 선택해도 누적된 총 갯수) */}
                {imageFiles.length > 0 && (
                  <span className="image-count">({imageFiles.length}개)</span>
                )}
              </label>
              {/* 파일 선택 input - 숨김 처리하고 커스텀 버튼으로 트리거 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*" // 이미지 파일만 선택 가능
                multiple // 여러 파일 동시 선택 가능
                onChange={handleImageChange} // 파일 선택 시 핸들러 호출
                disabled={loading || uploadingImages} // 로딩 중에는 비활성화
                className="file-input-hidden"
                id="file-input"
              />
              {/* 커스텀 파일 선택 버튼 */}
              <label
                htmlFor="file-input"
                className="file-input-label"
                style={{
                  pointerEvents: loading || uploadingImages ? "none" : "auto",
                  opacity: loading || uploadingImages ? 0.6 : 1,
                }}
              >
                파일 선택
              </label>
              {/* 선택된 이미지 미리보기 표시 */}
              {imagePreviews.length > 0 && (
                <div className="image-preview-container">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="image-preview-item">
                      <img src={preview} alt={`미리보기 ${index + 1}`} />
                      {/* 이미지 제거 버튼 */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="remove-image-btn"
                        disabled={loading || uploadingImages}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
              {/* 취소 버튼 - 게시글 목록으로 이동 */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/posts")}
                disabled={loading}
              >
                취소
              </Button>
              {/* 작성하기 버튼 - 폼 제출 */}
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "작성 중..." : "작성하기"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default PostWrite;
