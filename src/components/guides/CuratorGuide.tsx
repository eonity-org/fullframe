import type { Locale } from "@/i18n/core";
import { GITHUB_GUIDE, GuideFigure, GuideVideo } from "./GuidePage";

/**
 * The plain-language curator guide, for an exhibition the installation has
 * already connected: no vaults, keys or roles. Written out per language, like
 * the visitor guide; the technical reference stays in docs/user-guide.
 */
export const CURATOR_GUIDE_TITLE: Record<Locale, { eyebrow: string; title: string }> = {
  en: { eyebrow: "Help", title: "Curating an exhibition" },
  es: { eyebrow: "Ayuda", title: "Comisariar una exposición" },
};

export function CuratorGuide({ locale }: { locale: Locale }) {
  return locale === "es" ? <Es /> : <En />;
}

function En() {
  return (
    <>
      <p className="guide-lead">
        As a curator you prepare an exhibition in the <b>studio</b> and open it
        to the public when it&apos;s ready. Your exhibition is already set up for
        you: you only add people, photographs and words. Nothing goes public
        until you say so.
      </p>
      <GuideVideo name="curators-short-en" label="The whole process on Taming the Wind, in a minute and a half" />
      <p className="guide-more-video">
        <a href="/guide/video/curators-en.mp4">Watch it step by step (6 min)</a>
      </p>

      <h2>Before you start</h2>
      <p>
        Go to the FullFrame home page and click <b>Curator sign in</b>. Use the
        email and password your organisation gave you. Find your exhibition and
        click <b>Manage exhibition</b>. You can switch the studio between{" "}
        <b>English</b> and <b>Español</b> at the top right.
      </p>

      <h2>1 · Invite the photographers</h2>
      <ol>
        <li>Choose how many photographs each person can send.</li>
        <li>Type a photographer&apos;s name and click <b>Invite author</b>.</li>
        <li>
          Click <b>Copy link</b> and send that link to the photographer by email
          or message. Each person gets their own link.
        </li>
        <li>When everyone is invited, click <b>Open submissions</b>.</li>
      </ol>
      <GuideFigure locale="en" name="curators-authors" alt="Three photographers invited, each with a link" />
      <p>
        The photographers open their link, add their photographs with a title,
        and click <b>Finish</b>. They don&apos;t need an account. You&apos;ll see
        each one&apos;s progress, for example <i>2 / 3 photographs</i>.
      </p>

      <h2>2 · Ask a jury for their opinion (optional)</h2>
      <ol>
        <li>When all the photographs are in, click <b>Close submissions</b>.</li>
        <li>
          Type a juror&apos;s name, click <b>Invite juror</b>, then <b>Copy link</b>{" "}
          and send it to them.
        </li>
        <li>Click <b>Start judging</b>.</li>
      </ol>
      <p>
        Jurors open their link and give each photograph a score from 1 to 5.
        They can also write a private note that only you will read. Prefer to
        choose on your own? Click <b>Skip the jury</b>.
      </p>
      <GuideFigure locale="en" name="curators-jury" alt="What a juror sees: a photograph, a score from 1 to 5, a private note" />
      <p>When the jurors are done, click <b>Close judging</b>.</p>

      <h2>3 · Choose and write</h2>
      <p>Open the <b>Selection</b> tab.</p>
      <ol>
        <li>
          Write a one-line <b>Introduction</b> and a short text{" "}
          <b>About this exhibition</b>. Pick the <b>Cover photograph</b>. Click{" "}
          <b>Save details</b>.
        </li>
        <li>
          Click the photographs you want to show; each one shows the
          jury&apos;s average score to help you. Click <b>Save selection</b>.
        </li>
      </ol>
      <GuideFigure locale="en" name="curators-selection" alt="Choosing which photographs to show" />

      <h2>4 · Give it a look and open the doors</h2>
      <p>Open the <b>Appearance &amp; publish</b> tab.</p>
      <ol>
        <li>
          Pick a look: a light or dark room, the style of the titles and an
          accent colour. The preview shows your real photographs. Click{" "}
          <b>Apply style</b>.
        </li>
        <li>
          Click <b>Publish exhibition</b>, then <b>Publish now</b>. Your
          exhibition is open to everyone.
        </li>
      </ol>
      <GuideFigure locale="en" name="curators-publish" alt="The last check before opening: Ready to open the doors?" />

      <h2>Changing your mind later</h2>
      <ul>
        <li>
          <b>To fix a text</b> (introduction, about text, cover): edit it on{" "}
          <b>Selection</b> and click <b>Save details</b>. The exhibition stays
          open.
        </li>
        <li>
          <b>To add or remove photographs</b>: click <b>Close exhibition</b>,
          then <b>Back to preparing</b>. Make your changes, go through the steps
          again (the jury only scores what&apos;s new) and publish once more.
          Nothing you did before is lost.
        </li>
      </ul>

      <h2>More detail</h2>
      <ul>
        <li>
          <a href={`${GITHUB_GUIDE}/en/curators.md`}>Curating an exhibition</a>:
          the complete technical guide on GitHub, including connecting an
          exhibition and its connection settings.
        </li>
        <li>
          For the people you invite:{" "}
          <a href={`${GITHUB_GUIDE}/en/authors.md`}>Sending your photographs</a>{" "}
          and <a href={`${GITHUB_GUIDE}/en/jurors.md`}>Being on a jury</a>.
        </li>
      </ul>
    </>
  );
}

function Es() {
  return (
    <>
      <p className="guide-lead">
        Como comisario preparas la exposición en el <b>taller</b> y la abres al
        público cuando está lista. Tu exposición ya viene preparada: tú solo
        añades personas, fotografías y textos. Nada se hace público hasta que
        tú lo decides.
      </p>
      <GuideVideo name="curators-short-es" label="Todo el proceso con Domando el Viento, en minuto y medio" />
      <p className="guide-more-video">
        <a href="/guide/video/curators-es.mp4">Verlo paso a paso (6 min)</a>
      </p>

      <h2>Antes de empezar</h2>
      <p>
        En la página de inicio de FullFrame, haz clic en <b>Acceso al taller</b>.
        Entra con el correo y la contraseña que te ha dado tu organización.
        Busca tu exposición y haz clic en <b>Gestionar exposición</b>. Puedes
        cambiar el idioma del taller entre <b>English</b> y <b>Español</b>,
        arriba a la derecha.
      </p>

      <h2>1 · Invita a los fotógrafos</h2>
      <ol>
        <li>Elige cuántas fotografías puede enviar cada persona.</li>
        <li>Escribe el nombre de un fotógrafo y haz clic en <b>Invitar a un autor</b>.</li>
        <li>
          Haz clic en <b>Copiar enlace</b> y envíaselo por correo o mensaje.
          Cada persona tiene su propio enlace.
        </li>
        <li>Cuando hayas invitado a todos, haz clic en <b>Abrir convocatoria</b>.</li>
      </ol>
      <GuideFigure locale="es" name="curators-authors" alt="Tres fotógrafos invitados, cada uno con su enlace" />
      <p>
        Los fotógrafos abren su enlace, añaden sus fotografías con un título y
        hacen clic en <b>Terminar</b>. No necesitan cuenta. Verás cuántas ha
        enviado cada uno, por ejemplo <i>2 / 3 fotografías</i>.
      </p>

      <h2>2 · Pide opinión a un jurado (opcional)</h2>
      <ol>
        <li>Cuando estén todas las fotografías, haz clic en <b>Cerrar convocatoria</b>.</li>
        <li>
          Escribe el nombre de un miembro del jurado, haz clic en{" "}
          <b>Invitar a un miembro del jurado</b>, después en <b>Copiar enlace</b>,
          y envíaselo.
        </li>
        <li>Haz clic en <b>Abrir el jurado</b>.</li>
      </ol>
      <p>
        El jurado abre su enlace y da a cada fotografía una puntuación de 1 a 5.
        También puede escribir una nota privada que solo leerás tú. ¿Prefieres
        elegir sin jurado? Haz clic en <b>Seguir sin jurado</b>.
      </p>
      <GuideFigure locale="es" name="curators-jury" alt="Lo que ve el jurado: una fotografía, una puntuación de 1 a 5 y una nota privada" />
      <p>Cuando el jurado termine, haz clic en <b>Cerrar el jurado</b>.</p>

      <h2>3 · Elige y escribe</h2>
      <p>Abre la pestaña <b>Selección</b>.</p>
      <ol>
        <li>
          Escribe una <b>Introducción</b> de una línea y un breve texto{" "}
          <b>Sobre esta exposición</b>. Elige la <b>Fotografía de portada</b>.
          Haz clic en <b>Guardar datos</b>.
        </li>
        <li>
          Haz clic en las fotografías que quieres mostrar; cada una muestra la
          puntuación media del jurado para ayudarte. Haz clic en{" "}
          <b>Guardar selección</b>.
        </li>
      </ol>
      <GuideFigure locale="es" name="curators-selection" alt="Elegir qué fotografías mostrar" />

      <h2>4 · Dale un aspecto y abre las puertas</h2>
      <p>Abre la pestaña <b>Aspecto y publicación</b>.</p>
      <ol>
        <li>
          Elige un aspecto: una sala clara u oscura, el estilo de los títulos y
          un color de acento. La vista previa muestra tus fotografías reales.
          Haz clic en <b>Aplicar estilo</b>.
        </li>
        <li>
          Haz clic en <b>Publicar exposición</b> y después en{" "}
          <b>Publicar ahora</b>. Tu exposición queda abierta a todo el mundo.
        </li>
      </ol>
      <GuideFigure locale="es" name="curators-publish" alt="La última comprobación antes de abrir: ¿Abrimos las puertas?" />

      <h2>Si cambias de idea</h2>
      <ul>
        <li>
          <b>Para corregir un texto</b> (introducción, texto de la exposición,
          portada): edítalo en <b>Selección</b> y haz clic en{" "}
          <b>Guardar datos</b>. La exposición sigue abierta.
        </li>
        <li>
          <b>Para añadir o quitar fotografías</b>: haz clic en{" "}
          <b>Cerrar exposición</b> y después en <b>Volver a la preparación</b>.
          Haz los cambios, repite los pasos (el jurado solo valora lo nuevo) y
          vuelve a publicar. No pierdes nada de lo que hiciste antes.
        </li>
      </ul>

      <h2>Más detalle</h2>
      <ul>
        <li>
          <a href={`${GITHUB_GUIDE}/es/comisarios.md`}>Comisariar una exposición</a>:
          la guía técnica completa en GitHub, incluida la conexión de una
          exposición y sus ajustes.
        </li>
        <li>
          Para las personas que invitas:{" "}
          <a href={`${GITHUB_GUIDE}/es/autores.md`}>Enviar tus fotografías</a> y{" "}
          <a href={`${GITHUB_GUIDE}/es/jurado.md`}>Formar parte de un jurado</a>.
        </li>
      </ul>
    </>
  );
}
