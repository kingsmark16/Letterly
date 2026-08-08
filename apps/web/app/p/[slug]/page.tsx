type PublicPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicPage({
  params,
}: PublicPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;

  return (
    <main>
      <h1>Letterly public pages</h1>
      <p>This public page is reserved for a published Letterly confession.</p>
      <p>
        Requested slug: <code>{slug}</code>
      </p>
    </main>
  );
}
