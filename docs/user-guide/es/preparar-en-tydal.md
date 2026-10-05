# Preparar una exposición en TYDAL

[Guía de uso de FullFrame](README.md) › Preparar una exposición en TYDAL

*Para administradores de TYDAL.* Los comisarios no pueden empezar una exposición
por su cuenta: cada exposición necesita una **bóveda** en TYDAL que contenga sus
fotografías, y claves que permitan a FullFrame leerla y publicarla. Esta página
es la parte del trabajo que corresponde al administrador. Se hace una vez por
organización y después una vez por exposición, y lleva un par de minutos.

Los comandos se ejecutan en el servidor de TYDAL. El script
`tools/clients/fullframe.sh` del repositorio de TYDAL los ejecuta igual tanto si
TYDAL funciona en Docker como directamente en el servidor. La referencia
completa está en la
[guía de la CLI](https://github.com/eonity-org/tydal/blob/main/docs/CLI.md#photo-exhibitions-full-frame)
de TYDAL (en inglés).

## Una vez por organización

```bash
tools/clients/fullframe.sh setup --org=atlas --language=en
```

Esto prepara la organización para exposiciones de fotografía: el esquema
*Photo Exhibition* (título, autor, año, técnica, dimensiones, descripción), su
índice de búsqueda y una colección **Photos**. `--language` es el idioma en el
que se escribirán los textos de las fotografías (`en`, `es`, `ca`…). Se puede
volver a ejecutar sin problema.

## Una vez por exposición

```bash
tools/clients/fullframe.sh create --org=atlas --name="Small Wonders" --curator=ana@example.org
```

Esto crea:

- un **espacio de trabajo** (*workspace*) para las fotografías de la exposición;
- una **bóveda de galería privada** que muestra ese espacio de trabajo,
  configurada para que las fotografías añadidas desde FullFrame lleguen a él;
- una **clave de lectura** y una **clave de escritura**.

`--curator` (opcional) da a esa persona acceso al taller. Crea su cuenta de
TYDAL si hace falta (se te pide una contraseña) y la hace **editora** de la
organización. `--role=viewer` le da en cambio un taller de solo lectura, y
`--role=admin` le permite además administrar la organización en TYDAL.

Al final, el comando muestra:

```
Paste into Full Frame → "Connect an exhibition":
  Shared vault URL : https://tydal.example.org/v/atlas/small-wonders
  Read key         : tvk_…
  Write key        : tvk_…
```

**Las claves solo se muestran esta vez.** Envía las tres líneas al comisario por
un canal privado; las pegará en FullFrame (consulta
[Comisariar una exposición](comisarios.md#1--conecta-la-exposición)). Si se
pierde una clave, genera una nueva (ver más abajo).

## Qué permiten las claves

La clave de escritura tiene seis permisos, en dos grupos de tres:

| Permisos | Permiten a FullFrame |
|---|---|
| `activate`, `open`, `close` | publicar la selección del comisario y volver a cerrar la exposición |
| `ingest`, `update`, `withdraw` | añadir fotografías, corregir sus datos y quitarlas (subidas del comisario y convocatoria) |

Una clave sin el segundo grupo puede publicar igualmente, pero el recuadro para
añadir fotografías del taller y la convocatoria no funcionarán. El taller indica
qué permisos faltan.

## Hacerlo a mano

Todo lo anterior también se puede hacer en la interfaz web de TYDAL, como
administrador de la plataforma (consulta la guía de uso de TYDAL,
[Workspaces and vaults](https://github.com/eonity-org/tydal/blob/main/docs/user-guide/06-workspaces-and-vaults.md),
en inglés):

1. Crea un espacio de trabajo para la exposición en la organización.
2. En **Platform administration → Vault Sharing**, crea una bóveda con propósito
   **gallery**, estado **private**, que lea de ese espacio de trabajo.
3. En **Access keys** de la bóveda, genera una clave con *read* y otra con
   *activate, open, close, ingest, update, withdraw*.
4. En **Capabilities** de la bóveda, establece el **ingest target** (donde
   llegan las fotografías añadidas desde FullFrame) en ese espacio de trabajo y
   la colección Photos.

Da al comisario la **URL pública** de la bóveda (la *human URL*, en *Sharing &
reach*) y las dos claves.

## Mientras la exposición está en marcha

- No cambies a mano el estado ni los espacios de trabajo de la bóveda mientras
  la exposición esté abierta. FullFrame lo hace cuando el comisario publica o
  cierra.
- Las fotografías que quita un comisario van a la papelera de TYDAL, desde donde
  puedes restaurarlas.
- Cuando se elimina una exposición en FullFrame, sus fotografías, su espacio de
  trabajo y su bóveda permanecen en TYDAL. Archívalos o elimínalos allí si ya no
  se necesitan.

---

← [Formar parte de un jurado](jurado.md) · [Índice](README.md)
