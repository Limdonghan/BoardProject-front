import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { postAPI } from "../api/post";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Button from "../components/Button";
import "./PostList.css";

// 기본 이미지 URL (AWS S3)
const DEFAULT_IMAGE_URL =
  "https://board-image-s3-bucket.s3.ap-northeast-2.amazonaws.com/default_image.jpg";

const PostMy = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchMyPosts();
  }, [isAuthenticated]);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const response = await postAPI.getMyPosts();

      // 응답 구조: { totalPostCount: number, myPostList: Array }
      let postsData = [];

      if (Array.isArray(response)) {
        // 직접 배열로 오는 경우
        postsData = response;
      } else if (response && typeof response === "object") {
        // myPostList 필드에서 게시글 배열 가져오기
        postsData =
          response.myPostList ||
          response.content ||
          response.data ||
          response.posts ||
          [];
      }

      // postsData가 배열이 아니면 빈 배열로 설정
      if (!Array.isArray(postsData)) {
        postsData = [];
      }

      setPosts(postsData);
    } catch (error) {
      console.error("내 게시글 조회 실패:", error);
      console.error("에러 상세:", error.response?.data);
      console.error("에러 응답:", error.response);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="post-list-container">
        <div className="post-list-header">
          <h1 className="post-list-title">내 게시글</h1>
          <Button variant="primary" onClick={() => navigate("/posts/write")}>
            글쓰기
          </Button>
        </div>

        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="empty-state">작성한 게시글이 없습니다.</div>
        ) : (
          <div className="post-list">
            {posts.map(post => (
              <Link
                key={post.id}
                to={`/posts/${post.id}`}
                className="post-item"
              >
                <div className="post-item-content">
                  <div className="post-item-main">
                    <div className="post-item-header">
                      <span className="post-category">{post.category}</span>
                      <span className="post-date">
                        {formatDate(
                          post.createDate || post.createdDate || post.date
                        )}
                      </span>
                    </div>
                    <h2 className="post-title">{post.title}</h2>
                    <div className="post-item-footer">
                      <div className="post-author-info">
                        <span className="post-writer">
                          작성자:{" "}
                          {post.authorName ||
                            post.writer ||
                            post.user ||
                            post.username}
                        </span>
                      </div>
                      <div className="post-stats">
                        <span className="stat-item">
                          <span className="stat-icon">👁</span>
                          <span className="stat-value">
                            {post.viewCount || post.postView || 0}
                          </span>
                        </span>
                        <span className="stat-item">
                          <span className="stat-icon">👍</span>
                          <span className="stat-value">
                            {post.likeCount || 0}
                          </span>
                        </span>
                        <span className="stat-item">
                          <span className="stat-icon">💬</span>
                          <span className="stat-value">
                            {post.commentCount || 0}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="post-thumbnail">
                    <img
                      src={post.thumbnailUrl || DEFAULT_IMAGE_URL}
                      alt={post.title}
                      className="thumbnail-image"
                      onError={e => {
                        e.target.src = DEFAULT_IMAGE_URL;
                      }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PostMy;
