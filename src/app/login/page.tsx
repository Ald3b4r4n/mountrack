"use client";

import Image from "next/image";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FatSecretAttribution } from "@/components/FatSecretAttribution";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeNextPath } from "@/modules/billing/auth/login-navigation";

function LoginLoadingState() {
  return (
    <main
      className="container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <div
        className="skeleton-pulse"
        style={{ width: "400px", height: "350px" }}
      ></div>
    </main>
  );
}

function LoginContent() {
  const { user, loading, sessionReady, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (!loading && sessionReady && user) {
      router.push(nextPath);
    }
  }, [user, loading, sessionReady, nextPath, router]);

  if (loading) {
    return <LoginLoadingState />;
  }

  return (
    <main
      className="container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "85vh",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          left: "5%",
          width: "380px",
          height: "380px",
          opacity: 0.35,
          pointerEvents: "none",
          mixBlendMode: "screen",
          transform: "rotate(-15deg)",
        }}
      >
        <Image
          src="/images/dose-icon.png"
          alt=""
          width={380}
          height={380}
          style={{ objectFit: "contain" }}
        />
      </div>

      <div
        className="glass-panel anim-enter"
        style={{
          padding: "3.5rem",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          className="anim-enter"
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1.5rem",
          }}
        >
          <Logo size="xl" showText={false} />
        </div>

        <div
          className="anim-enter anim-delay-1"
          style={{ marginBottom: "0.75rem" }}
        >
          <Logo size="lg" />
        </div>

        <p
          className="anim-enter anim-delay-2"
          style={{
            color: "var(--text-secondary)",
            marginBottom: "2.5rem",
            fontSize: "0.95rem",
            lineHeight: "1.6",
          }}
        >
          Acompanhe sua jornada com
          <br />
          seguranca e privacidade.
        </p>

        <button
          onClick={signInWithGoogle}
          className="btn-primary anim-enter anim-delay-3"
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path
                fill="#4285F4"
                d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
              />
              <path
                fill="#34A853"
                d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
              />
              <path
                fill="#FBBC05"
                d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
              />
              <path
                fill="#EA4335"
                d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
              />
            </g>
          </svg>
          Continuar com Google
        </button>

        <p
          className="anim-enter anim-delay-4"
          style={{
            color: "var(--text-muted)",
            fontSize: "0.75rem",
            marginTop: "2rem",
            lineHeight: "1.5",
          }}
        >
          Seus registros ficam vinculados a sua conta
          <br />e protegidos pela autenticacao.
        </p>

        <div
          className="anim-enter anim-delay-4"
          style={{
            marginTop: "1rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <FatSecretAttribution compact />
        </div>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginContent />
    </Suspense>
  );
}
