/**
 * 全局 404 页面（根 layout 已提供 html/body，这里只渲染内容片段）
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight mb-4">404</h1>
      <p className="text-lg text-gray-400">This page could not be found.</p>
    </div>
  );
}
