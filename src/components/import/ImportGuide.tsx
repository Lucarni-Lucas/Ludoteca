import type { ReactNode } from "react";

import styles from "./ImportGuide.module.css";

type ImportGuideProps = Readonly<{
  title: string;
  lead: ReactNode;
  /** Cada paso con un id propio, que es su clave en la lista. */
  steps: readonly Readonly<{ id: string; content: ReactNode }>[];
  /** Lo que va después de los pasos, como el aviso de que el marcador de IGN puede dejar de andar. */
  children?: ReactNode;
}>;

/** Una guía «¿Cómo lo saco?»: el título, una línea de qué es y los pasos numerados (design.md §17). */
export function ImportGuide({ title, lead, steps, children }: ImportGuideProps) {
  return (
    <>
      <div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
      </div>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.id} className={styles.step}>
            <span aria-hidden="true" className={styles.number}>
              {index + 1}
            </span>
            <div className={styles.text}>{step.content}</div>
          </li>
        ))}
      </ol>
      {children}
    </>
  );
}

/** Un link a otra página (el autor del exportador): abre aparte y sin pasarle nada de Ludoteca. */
export function ExternalLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
      {children}
    </a>
  );
}

export function Mono({ children }: Readonly<{ children: ReactNode }>) {
  return <span className={styles.mono}>{children}</span>;
}
