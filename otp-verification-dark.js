/**
 * <otp-verification-dark>
 * Paso de "Ingresa tu código de verificación" en tema oscuro.
 *
 * Atributos: titulo, telefono, digitos, segundos-espera, texto-boton
 * Eventos: "verify" -> detail: { codigo }   |   "resend"
 */
class OtpVerificationDark extends HTMLElement {
  static get observedAttributes() {
    return ["titulo", "telefono", "digitos", "segundos-espera", "texto-boton"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._segundosRestantes = 0;
    this._intervalo = null;
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
    this._iniciarContador();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.innerHTML) {
      this._render();
      this._bindEvents();
    }
  }

  disconnectedCallback() {
    clearInterval(this._intervalo);
  }

  get _titulo() { return this.getAttribute("titulo") || "Ingresa tu código de verificación"; }
  get _telefono() { return this.getAttribute("telefono") || ""; }
  get _numDigitos() { return parseInt(this.getAttribute("digitos") || "6", 10); }
  get _segundosEspera() { return parseInt(this.getAttribute("segundos-espera") || "61", 10); }
  get _textoBoton() { return this.getAttribute("texto-boton") || "Continuar"; }

  _render() {
    const casillas = Array.from({ length: this._numDigitos }, (_, i) =>
      `<input type="text" inputmode="numeric" maxlength="1" class="casilla" data-indice="${i}" autocomplete="one-time-code" />`
    ).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --fondo: #0d0d12;
          --superficie: #17171f;
          --texto-principal: #ffffff;
          --texto-secundario: #9a9aa5;
          --acento: #3b5bfd;
          --borde: #2a2a35;
          --fuente: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

          display: block;
          font-family: var(--fuente);
          background: var(--fondo);
          color: var(--texto-principal);
          padding: 24px;
          border-radius: 16px;
          max-width: 360px;
        }

        * { box-sizing: border-box; }

        .titulo { font-size: 20px; font-weight: 700; margin: 16px 0 8px 0; }
        .subtitulo { font-size: 14px; color: var(--texto-secundario); line-height: 1.5; margin: 0 0 24px 0; }
        .telefono { color: var(--texto-principal); }

        .casillas { display: flex; gap: 8px; margin-bottom: 8px; }

        .casilla {
          width: 42px;
          height: 50px;
          text-align: center;
          font-size: 18px;
          background: var(--superficie);
          border: 1px solid var(--borde);
          border-radius: 10px;
          color: var(--texto-principal);
          font-family: var(--fuente);
        }

        .casilla:focus-visible { outline: none; border-color: var(--acento); }

        .mensaje-error { font-size: 13px; color: #ff6b6b; min-height: 18px; margin: 8px 0 0 0; }

        .contador { font-size: 13px; color: var(--texto-secundario); margin: 16px 0 24px 0; }

        .boton-primario {
          width: 100%;
          height: 50px;
          border-radius: 25px;
          border: none;
          background: var(--acento);
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          font-family: var(--fuente);
          cursor: pointer;
        }

        .boton-primario:hover { opacity: 0.9; }
      </style>

      <h1 class="titulo">${this._titulo}</h1>
      <p class="subtitulo">Enviado a <span class="telefono">${this._telefono}</span> por WhatsApp o SMS</p>

      <div class="casillas">${casillas}</div>
      <p class="mensaje-error" id="mensajeError"></p>
      <p class="contador" id="contador"></p>

      <button type="button" class="boton-primario" id="btnContinuar">${this._textoBoton}</button>
    `;

    this._casillas = Array.from(this.shadowRoot.querySelectorAll(".casilla"));
    this._mensajeError = this.shadowRoot.getElementById("mensajeError");
    this._contador = this.shadowRoot.getElementById("contador");
    this._btnContinuar = this.shadowRoot.getElementById("btnContinuar");
    this._casillas[0].focus();
  }

  _bindEvents() {
    this._casillas.forEach((input, indice) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        this.clearError();
        if (input.value && indice < this._casillas.length - 1) this._casillas[indice + 1].focus();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && indice > 0) this._casillas[indice - 1].focus();
      });
    });

    this._btnContinuar.addEventListener("click", () => {
      const codigo = this._casillas.map((c) => c.value).join("");
      if (codigo.length !== this._casillas.length) {
        this.setError("Completa el código antes de continuar");
        return;
      }
      this.dispatchEvent(new CustomEvent("verify", { detail: { codigo }, bubbles: true, composed: true }));
    });
  }

  _iniciarContador() {
    this._segundosRestantes = this._segundosEspera;
    clearInterval(this._intervalo);
    this._actualizar();

    this._intervalo = setInterval(() => {
      this._segundosRestantes -= 1;
      if (this._segundosRestantes <= 0) {
        clearInterval(this._intervalo);
        this._contador.innerHTML = `<a href="#" id="linkReenviar" style="color: var(--acento);">Reenviar código</a>`;
        this.shadowRoot.getElementById("linkReenviar").addEventListener("click", (e) => {
          e.preventDefault();
          this.dispatchEvent(new CustomEvent("resend", { bubbles: true, composed: true }));
          this._iniciarContador();
        });
        return;
      }
      this._actualizar();
    }, 1000);
  }

  _actualizar() {
    this._contador.textContent = `Reenviar en ${this._segundosRestantes}s`;
  }

  setError(mensaje) {
    this._mensajeError.textContent = mensaje;
    this._casillas.forEach((c) => (c.style.borderColor = "#ff6b6b"));
  }

  clearError() {
    this._mensajeError.textContent = "";
    this._casillas.forEach((c) => (c.style.borderColor = ""));
  }

  reset() {
    this._casillas.forEach((c) => (c.value = ""));
    this._casillas[0].focus();
    this.clearError();
  }
}

customElements.define("otp-verification-dark", OtpVerificationDark);
