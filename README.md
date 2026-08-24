# FICE — Feira de Iniciação Científica e Extensão
### IFC Campus Videira — Sistema de Inscrição de Trabalhos

Aplicação web (HTML + CSS + JavaScript puro, sem frameworks e sem backend) para
cadastrar, visualizar, alterar e excluir trabalhos inscritos na FICE. Os dados
ficam salvos no **localStorage** do navegador, portanto continuam disponíveis
depois de fechar e reabrir a página (no mesmo navegador/computador).

## Estrutura do projeto

```
fice-app/
├── index.html   → estrutura da página (formulário + tabela)
├── style.css    → estilos visuais
├── script.js    → lógica de CRUD e integração com o localStorage
└── README.md
```

## Como executar localmente

Não é necessário instalar nada. Basta abrir o arquivo `index.html` em um
navegador atual (Chrome, Edge ou Firefox), ou, se preferir servir por HTTP:

```bash
# dentro da pasta do projeto
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## Funcionalidades implementadas

- **Cadastrar**: formulário com validação HTML5 (`required`, `type="email"`,
  `type="date"`, `minlength`, `accept="application/pdf"`) para todos os campos
  pedidos: título, autor principal, e-mail, área/curso, modalidade
  (Iniciação Científica ou Extensão), data de apresentação, resumo, demais
  autores (opcional) e arquivo PDF.
- **Visualizar**: os trabalhos aparecem em uma tabela, com busca por
  título/autor e filtro por modalidade. Cada trabalho recebe um número de
  **protocolo** único (ex.: `FICE-2026-001`).
- **Alterar**: o botão "Editar" carrega os dados do trabalho de volta no
  formulário; ao salvar, o registro é atualizado (o PDF só precisa ser
  reenviado se for substituído).
- **Excluir**: o botão "Excluir" remove o registro após confirmação.
- **Armazenamento**: `localStorage.setItem` / `getItem`, salvando a lista de
  trabalhos como JSON. O PDF é convertido para Base64 (via `FileReader`) para
  poder ser salvo como texto e depois baixado pelo link "PDF" na tabela.
  Há um limite de 4&nbsp;MB por arquivo para não estourar a cota do
  navegador.

## Observações importantes

- O armazenamento é **local ao navegador**: dados cadastrados no Chrome não
  aparecem no Firefox, e limpar o cache/"dados do site" apaga os registros.
- Nenhuma informação é enviada a um servidor — tudo roda no próprio
  navegador do usuário.

## Como publicar no GitHub Pages

1. Crie um repositório público no GitHub (ex.: `fice-videira`).
2. Envie estes arquivos para o repositório:
   ```bash
   git init
   git add .
   git commit -m "Sistema de inscrição FICE"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/fice-videira.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings → Pages**.
4. Em "Branch", selecione `main` e a pasta `/ (root)`, depois clique em
   **Save**.
5. Após alguns instantes, o site ficará disponível em:
   `https://SEU-USUARIO.github.io/fice-videira/`
6. Envie o link do **repositório** (e, se quiser, também o link do site
   publicado) na atividade.
