/**
 * <pin-login>
 * Pantalla de "Bienvenido de nuevo, [Nombre]" con avatar de iniciales
 * y teclado numérico para ingresar un PIN.
 *
 * Atributos:
 *   nombre       -> ej. "Fernando" (se muestra en el saludo)
 *   iniciales    -> ej. "FB" (se muestra en el círculo del avatar)
 *   color-avatar -> color de fondo del círculo (default azul)
 *   digitos-pin  -> cantidad de puntos del PIN (default 6)
 *
 * Eventos:
 *   "pin-completo"     -> detail: { pin }   (cuando se llenan todos los dígitos)
 *   "olvidaste-codigo" -> clic en "¿Olvidaste tu código?"
 *
 * Métodos públicos:
 *   .reset()        -> limpia el PIN ingresado
 *   .marcarError()  -> sacude los puntos en rojo (PIN incorrecto)
 */
class PinLogin extends HTMLElement {
  static get observedAttributes() {
    return ["nombre", "iniciales", "color-avatar", "digitos-pin"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._pin = "";
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.innerHTML) this._render();
  }

  get _nombre() { return this.getAttribute("nombre") || "Usuario"; }
  get _iniciales() { return this.getAttribute("iniciales") || "US"; }
  get _colorAvatar() { return this.getAttribute("color-avatar") || "#3b5bfd"; }
  get _digitosPin() { return parseInt(this.getAttribute("digitos-pin") || "6", 10); }

  _render() {
    const puntos = Array.from({ length: this._digitosPin }, (_, i) => `<span class="punto" data-indice="${i}"></span>`).join("");
    const numeros = [1,2,3,4,5,6,7,8,9];

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --fondo: #0d0d12;
          --superficie: #17171f;
          --texto-principal: #ffffff;
          --texto-secundario: #9a9aa5;
          --acento: #3b5bfd;
          --color-error: #ff6b6b;
          --fuente: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

          display: block;
          font-family: var(--fuente);
          background: var(--fondo);
          color: var(--texto-principal);
          padding: 32px 24px;
          border-radius: 16px;
          max-width: 360px;
          text-align: center;
        }

        * { box-sizing: border-box; }

        .avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: ${this._colorAvatar};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          margin: 0 auto 16px auto;
        }

        .saludo { font-size: 15px; color: var(--texto-secundario); margin-bottom: 32px; }
        .saludo strong { color: var(--texto-principal); font-weight: 600; }

        .puntos { display: flex; justify-content: center; gap: 12px; margin-bottom: 40px; }

        .punto {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #2a2a35;
          transition: background 0.15s ease;
        }

        .punto.lleno { background: var(--acento); }
        .punto.error { background: var(--color-error); }

        .teclado {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          max-width: 260px;
          margin: 0 auto;
        }

        .tecla {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: var(--texto-principal);
          font-size: 22px;
          cursor: pointer;
          margin: 0 auto;
        }

        .tecla:hover { background: var(--superficie); }
        .tecla:active { background: #24242f; }

        .tecla-borrar { font-size: 18px; color: var(--texto-secundario); }

        .olvidaste {
          display: block;
          margin-top: 24px;
          font-size: 13px;
          color: var(--texto-secundario);
          text-decoration: underline;
          cursor: pointer;
          background: none;
          border: none;
          font-family: var(--fuente);
        }
      </style>

      <div class="avatar">${this._iniciales}</div>
      <p class="saludo">Bienvenido de nuevo, <strong>${this._nombre}</strong></p>

      <div class="puntos" id="puntos">${puntos}</div>

      <div class="teclado" id="teclado">
        ${numeros.map((n) => `<button type="button" class="tecla" data-num="${n}">${n}</button>`).join("")}
        <span></span>
        <button type="button" class="tecla" data-num="0">0</button>
        <button type="button" class="tecla tecla-borrar" id="btnBorrar">⌫</button>
      </div>

      <button type="button" class="olvidaste" id="btnOlvidaste">¿Olvidaste tu código?</button>
    `;

    this._puntosEl = Array.from(this.shadowRoot.querySelectorAll(".punto"));
    this._teclado = this.shadowRoot.getElementById("teclado");
    this._btnOlvidaste = this.shadowRoot.getElementById("btnOlvidaste");
  }

  _bindEvents() {
    this._teclado.addEventListener("click", (e) => {
      const tecla = e.target.closest("[data-num]");
      if (tecla) {
        this._agregarDigito(tecla.dataset.num);
        return;
      }
      if (e.target.id === "btnBorrar" || e.target.closest("#btnBorrar")) {
        this._pin = this._pin.slice(0, -1);
        this._actualizarPuntos();
      }
    });

    this._btnOlvidaste.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("olvidaste-codigo", { bubbles: true, composed: true }));
    });
  }

  _agregarDigito(digito) {
    if (this._pin.length >= this._digitosPin) return;
    this._pin += digito;
    this._actualizarPuntos();

    if (this._pin.length === this._digitosPin) {
      this.dispatchEvent(new CustomEvent("pin-completo", { detail: { pin: this._pin }, bubbles: true, composed: true }));
    }
  }

  _actualizarPuntos() {
    this._puntosEl.forEach((p, i) => {
      p.classList.toggle("lleno", i < this._pin.length);
      p.classList.remove("error");
    });
  }

  reset() {
    this._pin = "";
    this._actualizarPuntos();
  }

  marcarError() {
    this._puntosEl.forEach((p) => p.classList.add("error"));
    setTimeout(() => this.reset(), 500);
  }
}

customElements.define("pin-login", PinLogin);
