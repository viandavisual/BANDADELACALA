BANDA DE LA CALA · PATCH v0.19 -> v0.20
=========================================

SOBRESCRIURE A GITHUB:
- index.html
- app.js
- style.css
- manifest.webmanifest
- version.js
- sw.js
- editor.js
- editor.css
- editor/index.html
- editor/sw.js

NO CAL TOCAR:
- config.js
- data/content-published.js
- assets/
- Supabase / SQL / Edge Functions
- editor/manifest.webmanifest (ja era independent i correcte a v0.19)

IMPORTANT PWA v0.20
- APP i EDITOR mantenen manifests separats.
- El Service Worker de l'APP ja NO intercepta /editor/ ni editor.html.
- Les cachés de l'APP i de l'EDITOR ja NO s'esborren entre elles.
- APP: https://viandavisual.github.io/BANDADELACALA/
- EDITOR: https://viandavisual.github.io/BANDADELACALA/editor/

PRIMERA PROVA DESPRÉS DEL PATCH
1. Obre l'APP al navegador i recarrega-la una vegada.
2. Obre /editor/ i recarrega'l una vegada.
3. Comprova que cadascun mostra la seva pròpia caixa INSTAL·LAR.
4. Si encara tens una instal·lació antiga/confosa anterior a v0.20, desinstal·la NOMÉS aquella còpia antiga una vegada i instal·la de nou APP i EDITOR des de les seves URLs separades.
