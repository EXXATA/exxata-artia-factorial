export default function WorkspacePage({
  children,
  toolbar = null
}) {
  return (
    <div className="workspace-page">
      {toolbar ? (
        <section className="workspace-page-header workspace-page-header-compact">
          <div className="workspace-page-tools">
            {toolbar}
          </div>
        </section>
      ) : null}

      <div className="workspace-page-body">
        <div className="workspace-page-main">
          {children}
        </div>
      </div>
    </div>
  );
}
