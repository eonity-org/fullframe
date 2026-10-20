import type { Locale } from "@/i18n/core";
import { GITHUB_GUIDE, GuideFigure, GuideVideo } from "./GuidePage";

/**
 * The plain-language visitor guide. Written out per language rather than
 * sentence by sentence through `t()`: it is a document, not interface text,
 * and each version reads best written as a whole. The full reference stays in
 * docs/user-guide on GitHub.
 */
export const VISITOR_GUIDE_TITLE: Record<Locale, { eyebrow: string; title: string }> = {
  en: { eyebrow: "User guide", title: "Visiting an exhibition" },
  es: { eyebrow: "Guía de uso", title: "Visitar una exposición" },
};

export function VisitorGuide({ locale }: { locale: Locale }) {
  return locale === "es" ? <Es /> : <En />;
}

function En() {
  return (
    <>
      <p className="guide-lead">
        You don&apos;t need an account or anything to install. Open the
        exhibition&apos;s link in any browser, on a computer, tablet or phone.
      </p>
      <GuideVideo name="visitors-en" label="A visit to Taming the Wind, in one minute" />

      <h2>1 · The entrance</h2>
      <p>
        Every exhibition starts with its entrance page: the title, a short
        introduction, the story behind the photographs and a cover picture.
        Click <b>Enter the exhibition</b> to go in.
      </p>
      <GuideFigure locale="en" name="visitors-entrance" alt="The entrance page of Taming the Wind" />

      <h2>2 · Choose how to look</h2>
      <p>
        At the top right you can switch between up to three ways of looking.
        The curator decides which ones are available.
      </p>
      <ul>
        <li><b>Mosaic</b>: all the photographs together, side by side. Good for a first look.</li>
        <li><b>Gallery</b>: the photographs with their titles underneath, with more space around each one.</li>
        <li><b>Wall</b>: one photograph at a time, as large as your screen allows.</li>
      </ul>
      <GuideFigure locale="en" name="visitors-mosaic" alt="Mosaic: every photograph at a glance" />

      <h3>Find a photograph</h3>
      <ul>
        <li>
          <b>Search:</b> type a word in <b>Find a photograph…</b>. It looks in
          the titles, the authors, the descriptions and the tags.
        </li>
        <li>
          <b>Tags:</b> if the photographs have tags, a <b>Filters +</b> button
          appears next to the photograph count. Click it and pick a tag to see
          only those photographs; click the tag again, or <b>All photographs</b>,
          to see everything.
        </li>
        <li>
          <b>Nothing found?</b> Click <b>Clear search and filters</b> to start again.
        </li>
      </ul>

      <h2>3 · Look at one photograph up close</h2>
      <p>
        Click any photograph to open it on the <b>Wall</b>. You&apos;ll see its
        title, the author and, if there is one, a short description.
      </p>
      <ul>
        <li>
          Use the <b>‹</b> and <b>›</b> arrows on each side, or the arrow keys
          on your keyboard, to move to the previous or next photograph.
        </li>
        <li>
          Click <b>Slideshow</b> to let the photographs change on their own,
          about every five seconds. Click <b>Pause</b> to stop.
        </li>
      </ul>
      <GuideFigure locale="en" name="visitors-wall" alt="The Wall: one photograph at a time" />

      <h2>4 · About the exhibition</h2>
      <p>
        <b>About</b> takes you back to the entrance page, where you can read the
        introduction and the story of the exhibition again.
      </p>

      <h2>Good to know</h2>
      <ul>
        <li>The photographs are never cropped: you always see them as the photographer framed them.</li>
        <li>
          FullFrame appears in the exhibition&apos;s language. The links at the
          bottom of every page lead to FullFrame&apos;s home page, where you can
          find other open exhibitions.
        </li>
      </ul>

      <h2>More detail</h2>
      <ul>
        <li>
          <a href={`${GITHUB_GUIDE}/en/visitors.md`}>Visiting an exhibition</a>:
          the complete visitor guide on GitHub.
        </li>
        <li>
          <a href={`${GITHUB_GUIDE}/en/README.md`}>FullFrame user guide</a>:
          every role, in English and Spanish.
        </li>
      </ul>
    </>
  );
}

function Es() {
  return (
    <>
      <p className="guide-lead">
        No necesitas cuenta ni instalar nada. Abre el enlace de la exposición en
        cualquier navegador, desde el ordenador, la tableta o el móvil.
      </p>
      <GuideVideo name="visitors-es" label="Una visita a Domando el Viento, en minuto y medio" />

      <h2>1 · La entrada</h2>
      <p>
        Cada exposición empieza en su página de entrada: el título, una breve
        introducción, la historia de las fotografías y una imagen de portada.
        Haz clic en <b>Entrar en la exposición</b> para pasar.
      </p>
      <GuideFigure locale="es" name="visitors-entrance" alt="La página de entrada de Domando el Viento" />

      <h2>2 · Elige cómo mirar</h2>
      <p>
        Arriba a la derecha puedes cambiar entre hasta tres formas de mirar. El
        comisario decide cuáles están disponibles.
      </p>
      <ul>
        <li><b>Mosaico</b>: todas las fotografías juntas, una al lado de otra. Ideal para un primer vistazo.</li>
        <li><b>Galería</b>: las fotografías con su título debajo y más espacio alrededor.</li>
        <li><b>Muro</b>: una fotografía cada vez, tan grande como permita tu pantalla.</li>
      </ul>
      <GuideFigure locale="es" name="visitors-mosaic" alt="Mosaico: todas las fotografías de un vistazo" />

      <h3>Encuentra una fotografía</h3>
      <ul>
        <li>
          <b>Buscar:</b> escribe una palabra en <b>Busca una fotografía…</b>.
          Busca en los títulos, los autores, las descripciones y las etiquetas.
        </li>
        <li>
          <b>Etiquetas:</b> si las fotografías tienen etiquetas, aparece un botón
          <b> Filtros +</b> junto al número de fotografías. Haz clic y elige una
          etiqueta para ver solo esas fotografías; vuelve a hacer clic en la
          etiqueta, o en <b>Todas las fotografías</b>, para verlas todas.
        </li>
        <li>
          <b>¿No aparece nada?</b> Haz clic en <b>Borrar búsqueda y filtros</b>{" "}
          para empezar de nuevo.
        </li>
      </ul>

      <h2>3 · Mira una fotografía de cerca</h2>
      <p>
        Haz clic en cualquier fotografía para abrirla en el <b>Muro</b>. Verás
        su título, el autor y, si la tiene, una breve descripción.
      </p>
      <ul>
        <li>
          Usa las flechas <b>‹</b> y <b>›</b> de los lados, o las flechas del
          teclado, para ir a la anterior o a la siguiente.
        </li>
        <li>
          Haz clic en <b>Pase de fotografías</b> para que cambien solas, más o
          menos cada cinco segundos. Haz clic en <b>Pausar</b> para detenerlo.
        </li>
      </ul>
      <GuideFigure locale="es" name="visitors-wall" alt="El Muro: una fotografía cada vez" />

      <h2>4 · Sobre la exposición</h2>
      <p>
        <b>Sobre la exposición</b> te devuelve a la página de entrada, donde
        puedes volver a leer la introducción y la historia de la exposición.
      </p>

      <h2>Conviene saber</h2>
      <ul>
        <li>Las fotografías nunca se recortan: siempre las ves tal como las encuadró su autor.</li>
        <li>
          FullFrame aparece en el idioma de la exposición. Los enlaces al pie de
          cada página llevan a la página de inicio de FullFrame, donde
          encontrarás otras exposiciones abiertas.
        </li>
      </ul>

      <h2>Más detalle</h2>
      <ul>
        <li>
          <a href={`${GITHUB_GUIDE}/es/visitantes.md`}>Visitar una exposición</a>:
          la guía completa para visitantes en GitHub.
        </li>
        <li>
          <a href={`${GITHUB_GUIDE}/es/README.md`}>Guía de uso de FullFrame</a>:
          todos los perfiles, en español e inglés.
        </li>
      </ul>
    </>
  );
}
