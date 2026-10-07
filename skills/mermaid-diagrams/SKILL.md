---
name: mermaid-diagrams
description: Diagrammi mermaid nei documenti markdown di QUALSIASI progetto, in modo che RENDANO davvero nella preview di VSCode e su GitHub. Usala prima di aggiungere o modificare un diagramma in docs/ — livelli, architettura, UML, sequence. Porta la regola su quando pre-renderizzare in SVG, i due script (validatore e renderer), il meccanismo per cui la preview lascia riquadri vuoti senza dare errore, e i vicoli ciechi già verificati da non ripercorrere. LIVING DOC — ogni scoperta nuova si aggiunge qui.
---

# Mermaid nei documenti markdown

**Il fallimento è silenzioso.** Un diagramma che non va nella preview di VSCode non dà un errore:
lascia un riquadro vuoto. Non c'è niente da leggere, quindi si indovina, e ogni tentativo costa un
giro sugli occhi di Pablo. Il 2026-08-03 quel giro è successo **sette volte** prima di arrivare alla
causa vera. Questa skill esiste perché non succeda più.

La skill è un plugin (`mermaid-diagrams@pablolok-skills`) e vale per ogni progetto. Il percorso del
plugin cambia a ogni versione, quindi **nessun documento né hook cita la cartella della skill**: il
progetto copia una volta `bootstrap/mermaid.mjs` della skill in `scripts/mermaid.mjs`, lo committa, e
da lì il comando è sempre lo stesso:

```bash
node scripts/mermaid.mjs check <file.md> [altri.md]      # il validatore (check-mermaid.mjs)
node scripts/mermaid.mjs render <cartella-dei-diagrammi>  # il renderer (render-svg.mjs)
```

Il launcher fissa la versione della skill (`VERSION`, l'unico posto dove il progetto la sceglie) e la
trova così: `MERMAID_SKILL_DIR` se c'è; una copia in `.claude/skills/mermaid-diagrams` del progetto
alla stessa versione; altrimenti un clone del repo delle skill al tag `mermaid-diagrams@<versione>`,
scaricato una volta in `CLAUDE_SKILLS_CACHE` (default `~/.cache/claude-skills`) e poi riusato offline.
Gli argomenti passano agli script, il codice d'uscita torna indietro, la cwd resta la tua. **Il clone
non ha `node_modules`**: se `mermaid` o `jsdom` non si risolvono né dal progetto né dal clone, il
launcher ci installa una volta il `package.json` della skill (`bun install`, o `npm install` senza
bun) e lo dice in una riga. Un progetto che ha già le deps non fa mai scattare l'installazione.

In una sessione, in un progetto senza launcher, gli script si lanciano anche dalla cartella base della
skill (`node <cartella della skill>/check-mermaid.mjs …`) — ma lì di deps ci sono solo quelle del
progetto.

Le dipendenze si risolvono in ordine: **prima il progetto in cui stai, poi la skill.** Il progetto
vince apposta — chi si è pinnato una versione se la tiene, e il confronto fra versioni descritto in
*Versioni in gioco* è basato sulla cwd e morirebbe se vincesse la copia della skill. La copia nella
skill è la rete, non la regola. Se preferisci le deps nel progetto, la strada vecchia vale ancora:

```bash
bun add -d mermaid jsdom @mermaid-js/mermaid-cli   # i primi due per il validatore, il terzo per gli SVG
```

> ⚠️ `bunx mmdc` resta solo come **ultima** spiaggia (richiede bun sul PATH e si scarica mermaid-cli
> a ogni giro). Il renderer cerca prima il binario installato, e i nomi degli shim su Windows non
> sono intercambiabili: **npm scrive `mmdc.cmd`, bun scrive `mmdc.exe`**, POSIX un `mmdc` nudo. Se
> ne cerchi uno solo, il fallimento è silenzioso: ripiega su bunx e sembra che funzioni.

I due JSON di configurazione (`.mermaid-config.json`, `.mermaid-puppeteer.json`) viaggiano **con la
skill**, non col progetto — incluso il percorso di Chrome, che è della macchina, non del repo (quello
della skill è `C:/Program Files/Google/Chrome/Application/chrome.exe`). Un progetto che ne vuole di
diversi, o una macchina col Chrome altrove, ne mette una copia nella propria root: quella vince. Mai
correggerli dentro la skill: il prossimo aggiornamento del plugin li sovrascrive.

## La regola, in una riga

| il documento ha… | cosa fare |
|---|---|
| **fino a 2 diagrammi semplici** | blocchi ```mermaid live — vedi *Procedura B* |
| **3 o più, oppure diagrammi grandi** | **pre-renderizza in SVG** — vedi *Procedura A* |
| in ogni caso | valida prima di dire che funziona |

La soglia non è estetica: sopra i due diagrammi la preview **perde una corsa** e non disegna niente.
Il perché sta in *La corsa*, più sotto — è la cosa da capire una volta sola.

---

## Procedura A — pre-renderizzare in SVG (la via affidabile)

I sorgenti stanno in `.mmd`, autorevoli e diffabili; il documento incorpora l'immagine e linka il
`.mmd`. Un'immagine non ha niente da calcolare: rende all'istante, ovunque, e non c'è nessuna corsa da
perdere.

### ⚠️ Una cartella PER DOCUMENTO — mai un raccoglitore comune

**Un diagramma appartiene a un documento solo.** I suoi sorgenti stanno in una cartella dedicata a
quel documento, che si chiama **come il documento** — e quelle cartelle stanno tutte **sotto un
`diagrams/`**, accanto ai documenti:

```
docs/architecture/title-match-gate.md
docs/architecture/readers/comix.md
docs/architecture/diagrams/
    title-match-gate/            ← i diagrammi di title-match-gate.md, e nient'altro
        01-percorso.mmd + .svg
        02-decisione.mmd + .svg
    readers/comix/               ← il percorso del documento, senza `.md`
        01-due-classi.mmd + .svg
```

⭐ **La regola, in una riga: il percorso del documento senza `.md`, sotto `diagrams/`.** Per un
documento in una sottocartella la sottocartella si ripete — così due documenti omonimi in cartelle
diverse non collidono, e da un `.mmd` si risale al suo documento senza cercarlo.

⚠️ **Il `diagrams/` intermedio non è cosmesi**, ed è nato da un problema misurato (06/09, direzione
dell'utente: *«non la facciamo stare nella root, si fa confusione con altre eventuali sotto cartelle
di architecture»*). In `docs/architecture/` le cartelle dei diagrammi erano **undici**, sedute
accanto ai documenti e accanto a `readers/`, che è una cartella **di documenti**: da fuori le due
specie sono indistinguibili, e un `ls` della radice non dice più cosa c'è nell'area. Sotto
`diagrams/` la radice torna a essere l'elenco dei documenti più una cartella sola.

Per un lavoro che ha una cartella sua (`<docs>/<nome-del-lavoro>/spec.md`) la cartella è la sua
`diagrams/`: è la stessa regola — **una per documento**, non una per repo.

Un `diagrams/` unico che raccoglie i diagrammi di tutti i documenti sembra ordine e non lo è
(misurato sul campo il 2026-08-05, correggendo esattamente questo):

- **i nomi devono portare il prefisso del documento** (`title-gate-01-…`, `search-01-…`) per non
  collidere. Quel prefisso **è** la cartella mancante, scritta a mano su ogni file;
- **la numerazione non riparte**, quindi non dice più «il primo diagramma di questo documento»;
- **il renderer ri-renderizza tutto** a ogni giro, anche i diagrammi di documenti non toccati: con
  una cartella per documento si rigenera solo quella (`mermaid.mjs render docs/guides/<documento>`);
- **quando un documento muore nessuno sa quali diagrammi portarsi via**, e restano lì per sempre.

⭐ **`diagrams/<documento>/` non è quel raccoglitore**, ed è la distinzione da tenere: le quattro
proprietà qui sopra dipendono dall'esistere **una cartella per documento**, non da dove quelle
cartelle stanno. Annidarle sotto un genitore comune le conserva tutte e quattro; fonderle in un
`diagrams/` piatto le perde tutte e quattro.

```bash
node scripts/mermaid.mjs render <cartella-del-documento>
```

Nel documento (il link parte dal documento, quindi è `./<nome-documento>/NN-nome.svg`):

```markdown
![Descrizione del diagramma](./title-match-gate/01-percorso.svg)

<sub>Sorgente: [`title-match-gate/01-percorso.mmd`](./title-match-gate/01-percorso.mmd).
Rigenera con `node scripts/mermaid.mjs render docs/guides/title-match-gate`.</sub>
```

Per modificarne uno: si edita il `.mmd`, si rigenera, si committano **entrambi**.

Lo script usa **mermaid-cli che pilota il Chrome installato** (`.mermaid-puppeteer.json` della skill,
così non scarica Chromium; il percorso è della macchina — se il Chrome sta altrove si corregge con una
copia del file nella root del progetto, non nella skill). Fallisce da solo su tre condizioni, che
sono i tre modi in cui ci si è già sbagliati:

- **`foreignObject` nell'output** — un `<img src="*.svg">` **non** lo renderizza, quindi con le
  etichette HTML uscirebbero riquadri vuoti: lo stesso bug, per un'altra strada. Da qui
  `htmlLabels: false` in `.mermaid-config.json`.
- **`viewBox` sproporzionato** (rapporto oltre 12) — è la firma di un renderer che non ha misurato il
  testo. Vedi *Vicoli ciechi*, punto 3.
- **`viewBox` non valido o assente.**

Lo sfondo scuro è cablato nell'SVG (`-b '#1e1e1e'`): il tema dark disegna testo chiaro, che su fondo
bianco sparirebbe.

## Procedura B — blocchi live (documenti piccoli)

```bash
node scripts/mermaid.mjs check <file.md> [altri.md]
```

Due passaggi, perché falliscono in modi diversi: **`parse`** coglie la sintassi, **`render`** esegue
`mermaid.render()` sotto jsdom e coglie ciò che il parse non vede. Esce 1 se qualcosa non passa.

> ⚠️ **Guarda che conti i diagrammi** (`<file> — N diagram(s)`): un file senza blocchi trovati non
> stampa niente e il validatore chiude con «All diagrams parse.». Misurato il 2026-10-07: la copia a
> livello utente, prima del plugin, cercava ```` ```mermaid ```` seguito da `\n` soltanto, e su un file
> CRLF — ogni checkout Windows con `core.autocrlf` — non trovava **nessun** blocco e passava. Ora
> accetta anche `\r\n`.

> **`render` sotto jsdom NON verifica il layout.** Dice «non ha lanciato eccezioni», non «viene
> bene». Per il disegno serve un browser: è la Procedura A.

Il tema si imposta **una volta sola per progetto**, in `.vscode/settings.json` (in
double-entry-darling è già committato):

```jsonc
"markdown-mermaid.lightModeTheme": "dark",
"markdown-mermaid.darkModeTheme": "dark",
"markdown-mermaid.mouseNavigation.enabled": "never",
"markdown-mermaid.controls.show": "never",
"markdown-mermaid.resizable": false,
"markdown-mermaid.maxTextSize": 100000
```

Forzato `dark` in entrambe le modalità perché `darkModeTheme` dovrebbe già seguire il tema di VSCode
e invece i diagrammi uscivano chiari su pagina scura. Pablo lavora in dark.

**Nei blocchi live non cablare colori**: ci pensa il tema, e un fill scuro fisso diventa illeggibile
per chi apre lo stesso file su GitHub in chiaro. Solo `classDef` semantici, con colori che reggano su
entrambi i fondi — e `classDef` **sempre prima** dei `class` che lo usano:

```
classDef bad fill:#5c1a1a,stroke:#ff8a80,color:#ffffff
class GATE bad
```

(Negli SVG pre-renderizzati vale l'opposto: lì il colore è cablato apposta, perché l'immagine deve
bastare a sé stessa.)

---

## Vicolo cieco: i tag HTML nelle etichette escono come testo

Misurato il 2026-08-30. Con `htmlLabels: false` — che è **la** impostazione di questa skill, perché
un `<img src="*.svg">` non renderizza `foreignObject` — i tag HTML nelle etichette non vengono
interpretati: `A["<b>Api</b>"]` disegna un riquadro con dentro la scritta `<b> Api </b>`.

`<br/>` invece funziona: mermaid lo tratta a parte, non come HTML.

Quindi: **niente grassetto, corsivo o `<span>` nelle etichette.** L'enfasi si ottiene con la forma del
nodo o con un `classDef`, non con il markup. Il parse non se ne accorge — il diagramma è valido — e
solo guardandolo si vede il tag scritto per esteso.

## Vicolo cieco: `note ... end note` multi-riga in uno stateDiagram

Misurato il 2026-08-30. Un blocco che **parsa** senza problemi:

```
stateDiagram-v2
    note right of Pubblicata
        due righe
        qui dentro
    end note
```

`check-mermaid.mjs` lo dà OK — `parse` e `render` sotto jsdom passano entrambi. Il renderer vero
muore:

```
Error: splitLineToFitWidth does not support newlines in the line
```

È la dimostrazione più netta del confine che la skill dichiara: **jsdom sa dirti che un diagramma
parsa, non che si disegna.** Qui non è nemmeno il layout a essere brutto — è il render a lanciare, e
solo la Procedura A o un render manuale se ne accorgono.

Rimedio: nota su una riga sola, o niente nota. Nel caso reale la nota ripeteva la prosa accanto, e
toglierla ha migliorato il documento — vale la pena chiedersi se serviva, prima di accorciarla.

## La corsa — perché la preview lascia riquadri vuoti

Dal sorgente dell'estensione, `dist-preview/index.bundle.js`, in coda:

```js
async function h03(){
  for (let i of cs2) i.dispose();   // butta i diagrammi già disegnati
  ls2?.abort();                      // ANNULLA il render precedente
  ...
}
window.addEventListener("vscode.markdown.updateContent", h03);
h03();                               // e ne parte subito uno
```

**Ogni ciclo annulla quello prima.** All'apertura ne parte uno inline e VSCode ne innesca altri con
`updateContent`: se il ciclo non finisce prima del successivo viene abortito, e il contenitore resta
vuoto **senza alcun errore**. Modificando il file a preview aperta l'aggiornamento è uno solo, il
render arriva in fondo e il diagramma appare.

Da qui il sintomo diagnostico: **«si vede quando modifichi, sparisce quando riapro» = corsa persa**,
non contenuto rotto.

Misurato il 2026-08-03: `architecture.md` (5 diagrammi) ~1700 ms per ciclo, `smoke-test.md`
(6 diagrammi piccoli) ~200 ms. Il secondo la corsa la vince. È da lì che viene la soglia dei due
diagrammi.

## Cosa rompe davvero un diagramma

| costrutto | esito | usa invece |
|---|---|---|
| entità HTML nelle etichette: `subgraph D["src/lib/&lt;domain&gt;"]` | riquadro vuoto | niente entità: `["src/lib"]` |
| tag HTML inline: `["testo <i>corsivo</i>"]` | rischio sanitizzazione | testo semplice |
| generici con virgola nel `classDiagram`: `Map~K, V~ handlers` | parse rotto | `Map handlers` |
| virgola nel TESTO di una nota a **due** partecipanti: `Note over A,B: x, y` | parse rotto — `Expecting 'SOLID_ARROW'… got ','`: dopo `A,B` il parser sta ancora leggendo l'elenco dei partecipanti e la virgola del testo lo rimanda lì. Con **un** partecipante la stessa virgola passa | togli la virgola dal testo, o riduci a `Note over A: x, y` (misurato 2026-08-05: stesso file, stesso testo, solo il secondo partecipante fa la differenza) |
| `class X bad` prima di `classDef bad` | passa il parse, applicazione non garantita | `classDef` sempre prima |
| etichette HTML in un SVG dentro un `<img>` | etichette vuote | `htmlLabels: false` (già in Procedura A) |

Reggono: `<br/>` nelle etichette, parentesi e punteggiatura in stringhe quotate, cilindri `[( )]`,
cerchi `(( ))`, `classDef`/`class`/`style`, `subgraph` con titolo quotato, `<<interface>>`,
`alt`/`else` nei sequence.

Regola pratica: **stringhe quotate e ASCII semplice nelle etichette.** Ciò che non è testo va nella
prosa attorno al diagramma, dove nessun parser lo può rompere.

## Se qualcosa non si vede, in quest'ordine

1. **Stai ancora scrivendo il file?** Finisci, poi guarda. (Non è la causa principale — vedi *Vicoli
   ciechi* n.1 — ma toglie rumore.)
2. **Esegui il validatore.** Se passa, il contenuto è fuori causa: salta al punto 4.
3. Se non passa, correggi con la tabella qui sopra.
4. **Apri `smoke-test.md`** (accanto a questa skill): sei diagrammi in scala, ognuno aggiunge una sola
   cosa al precedente. Il primo che sparisce nomina il colpevole; se salta già il n.1, non è il
   contenuto.
5. **Passa alla Procedura A.** Se il documento ha più di due diagrammi, è comunque la risposta.
6. **`Ctrl+Shift+P` → *Developer: Open Webview Developer Tools*** con la preview aperta: è l'unico
   posto dove l'errore vero compare. Tutto il resto è inferenza; questa è osservazione — e va fatta
   prima, non dopo cinque tentativi.

## Vicoli ciechi — verificati e falsi, non ripercorrerli

1. **«Il file cambia sotto la preview mentre la guardi.»** Plausibile e scritto qui per un'ora come
   causa principale. **Falso**: il sintomo era l'opposto — appariva *durante* le modifiche e spariva
   *riaprendo*. La causa è la corsa all'apertura.
2. **«Due estensioni mermaid in conflitto.»** Falso: ne è installata una sola,
   `bierner.markdown-mermaid-1.32.1`, che impacchetta mermaid 11.12.2.
3. **«Genero gli SVG con jsdom.»** Il tentativo peggiore. Non lanciava eccezioni e produceva file
   inutilizzabili: `viewBox="-8 -8 27822 34"`, tutti i nodi su una riga infinita, più un attributo
   `style` duplicato che rendeva l'XML non valido. Senza misura del testo il layout non esiste.
   **jsdom dice se un diagramma si ANALIZZA, non se si DISEGNA.**
4. **«È la direttiva `%%{init: {'theme':'dark'}}%%`.»** Sospettata perché coincise con due sparizioni.
   Quasi certamente innocente: era la corsa. Resta comunque sconsigliata — il tema si imposta nei
   settings, non per diagramma.
5. **«Passa il parser, quindi è a posto.»** L'errore concettuale sotto a tutti gli altri: parse,
   render e layout sono tre affermazioni diverse, e per sei giri ne ho verificata una spacciandola per
   le altre due.

## Versioni in gioco

- Preview di VSCode: `bierner.markdown-mermaid` 1.32.1 → **mermaid 11.12.2**.
- Gli script: **mermaid** e **@mermaid-js/mermaid-cli** presi dal progetto in cui li lanci se ce li
  ha (in double-entry-darling, 11.16), altrimenti dal `node_modules` della skill stessa (11.17 /
  11.16 al 2026-08-24).
- GitHub: la sua, non dichiarata.

Non coincidono mai del tutto. Per provare una versione più vecchia: `bun add mermaid@10 jsdom` in una
cartella temporanea e puntaci `check-mermaid.mjs`. Fatto per la 10 e la 11 — passavano entrambe mentre
la preview mostrava il vuoto, ed è così che si è capito che non era la sintassi.

## Convenzioni per i diagrammi di architettura

- **Livelli** = `flowchart TD`, un `subgraph` per livello; le frecce dicono chi chiama chi.
- **Componenti** = `classDiagram`, `<<interface>>` sui contratti.
- **Percorsi** = `sequenceDiagram`, `alt`/`else` per i due mondi (con rete / senza).
- Un `%%` di commento dentro il blocco non compare nel render: usalo per annotare le scelte.
- Il diagramma mostra la struttura; numeri e prove stanno nella prosa attorno. Un'etichetta che vuole
  una frase è prosa travestita.

## Via di fuga: pubblicare come Artifact

Se serve leggere i diagrammi fuori da VSCode, pubblica il markdown come Artifact: renderizza mermaid
nativamente e segue il tema di chi guarda. Per quella copia togli i colori cablati, che litigherebbero
col tema nativo. Il markdown nel repo resta la fonte di verità; dillo in testa alla pagina.
