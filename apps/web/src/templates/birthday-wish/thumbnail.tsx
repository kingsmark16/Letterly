export function BirthdayWishThumbnail({
  id,
  letterTitle,
}: {
  id: string;
  letterTitle?: string;
}): React.JSX.Element {
  const title = letterTitle?.trim() || "Golden Hour Birthday Edition";
  const headingId = `${id}-heading`;

  return (
    <main
      className="min-h-screen px-5 py-10 sm:px-8 sm:py-16"
      style={{
        background:
          "radial-gradient(circle at 20% 15%, rgba(245, 196, 105, 0.18), transparent 38%), linear-gradient(165deg, #130c08 0%, #22150d 52%, #110a06 100%)",
        color: "#1e130c",
      }}
    >
      <section
        className="mx-auto w-full max-w-2xl rounded-large border p-7 shadow-low sm:p-10"
        aria-labelledby={headingId}
        style={{
          background:
            "linear-gradient(180deg, #fffdf9 0%, #fbf2e1 58%, #f6e7cc 100%)",
          borderColor: "rgba(212, 155, 59, 0.56)",
          boxShadow: "0 26px 64px rgba(10, 5, 2, 0.48)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            paddingBottom: "16px",
            marginBottom: "22px",
            borderBottom: "1px solid rgba(186, 134, 52, 0.32)",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "999px",
              background: "linear-gradient(180deg, #26180f 0%, #170e08 100%)",
              color: "#f5c469",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            ✦ Solar Return Edition
          </span>
          <span
            style={{
              color: "#8a5a14",
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.3fr) minmax(140px, 0.7fr)",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <div>
            <p
              className="text-label font-bold uppercase tracking-[0.14em]"
              style={{ color: "#966516", margin: 0 }}
            >
              Interactive 3-Candle Keepsake
            </p>
            <h2
              id={headingId}
              className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ color: "#1e130c", lineHeight: 1.06 }}
            >
              Happy Birthday, Elena <span aria-hidden="true">✦</span>
            </h2>
            <p
              className="mt-3 text-small"
              style={{ color: "#5c4332", lineHeight: 1.65 }}
            >
              Blow out the three golden tapers, flip your birthday blessing
              cards, and open the gilded linen dispatch.
            </p>
          </div>

          <div
            aria-hidden="true"
            style={{
              display: "grid",
              placeItems: "center",
              padding: "16px 12px",
              borderRadius: "20px",
              background:
                "radial-gradient(circle at 50% 24%, rgba(245, 196, 105, 0.24), transparent 62%), linear-gradient(165deg, #24160d 0%, #140c07 100%)",
              border: "1px solid rgba(212, 155, 59, 0.52)",
            }}
          >
            <svg width="116" height="96" viewBox="0 0 116 96" fill="none">
              <path
                d="M36 8C38.5 12 39.5 15 39.5 17.5C39.5 20.2 37.9 22 36 22C34.1 22 32.5 20.2 32.5 17.5C32.5 15 33.5 12 36 8Z"
                fill="#f5c469"
              />
              <path
                d="M58 5C60.8 9.5 62 12.8 62 15.6C62 18.6 60.2 20.5 58 20.5C55.8 20.5 54 18.6 54 15.6C54 12.8 55.2 9.5 58 5Z"
                fill="#ffd97d"
              />
              <path
                d="M80 8C82.5 12 83.5 15 83.5 17.5C83.5 20.2 81.9 22 80 22C78.1 22 76.5 20.2 76.5 17.5C76.5 15 77.5 12 80 8Z"
                fill="#f5c469"
              />
              <rect
                x="32"
                y="23"
                width="8"
                height="18"
                rx="2.5"
                fill="#fffdf8"
                stroke="#d49b3b"
                strokeWidth="1.2"
              />
              <rect
                x="54"
                y="21"
                width="8"
                height="20"
                rx="2.5"
                fill="#fffdf8"
                stroke="#d49b3b"
                strokeWidth="1.2"
              />
              <rect
                x="76"
                y="23"
                width="8"
                height="18"
                rx="2.5"
                fill="#fffdf8"
                stroke="#d49b3b"
                strokeWidth="1.2"
              />
              <rect
                x="24"
                y="40"
                width="68"
                height="20"
                rx="6"
                fill="#fffdf8"
                stroke="#d49b3b"
                strokeWidth="1.4"
              />
              <rect
                x="14"
                y="59"
                width="88"
                height="24"
                rx="7"
                fill="#f7e6c4"
                stroke="#d49b3b"
                strokeWidth="1.5"
              />
              <rect
                x="8"
                y="82"
                width="100"
                height="5"
                rx="2.5"
                fill="#d49b3b"
              />
            </svg>
          </div>
        </div>

        <div className="mt-7 grid gap-3" aria-hidden="true">
          <div
            className="rounded-medium border px-5 py-4 text-small font-semibold"
            style={{
              background: "#fffefa",
              borderColor: "rgba(186, 134, 52, 0.38)",
              color: "#1e130c",
            }}
          >
            WISH I · The Year Behind You · Gratitude
          </div>
          <div
            className="rounded-medium border px-5 py-4 text-small font-semibold"
            style={{
              background: "linear-gradient(165deg, #24160e 0%, #170e09 100%)",
              borderColor: "#eab04e",
              color: "#fff8eb",
            }}
          >
            WISH II · This Moment Today · Illuminated ✦
          </div>
        </div>
      </section>
    </main>
  );
}
