/**
 * <phone-login-dark>
 * Paso de "¿Cuál es tu número de teléfono?" en tema oscuro.
 *
 * Atributos:
 *   titulo, subtitulo, codigo-pais, iso-pais, bandera, placeholder,
 *   min-digitos, texto-boton, texto-correo
 *
 * Eventos:
 *   "continue"      -> detail: { telefonoCompleto, telefono }
 *   "login-correo"  -> cuando dan clic en "Iniciar sesión con correo electrónico"
 */
class PhoneLoginDark extends HTMLElement {
  static get observedAttributes() {
    return ["titulo", "subtitulo", "codigo-pais", "iso-pais", "bandera", "placeholder", "min-digitos", "texto-boton", "texto-correo"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.innerHTML) this._render();
  }

  get _titulo() { return this.getAttribute("titulo") || "¿Cuál es tu número de teléfono?"; }
  get _subtitulo() { return this.getAttribute("subtitulo") || "Te enviaremos un código de 6 dígitos por mensaje para confirmar que es tuyo."; }
  get _codigoPais() { return this.getAttribute("codigo-pais") || "+52"; }
  get _bandera() { return this.getAttribute("bandera") || "🇲🇽"; }
  get _placeholder() { return this.getAttribute("placeholder") || "222 123 4567"; }
  get _minDigitos() { return parseInt(this.getAttribute("min-digitos") || "10", 10); }
  get _textoBoton() { return this.getAttribute("texto-boton") || "Continuar"; }
  get _textoCorreo() { return this.getAttribute("texto-correo") || "Iniciar sesión con correo electrónico"; }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          /* ---- AQUÍ SE PERSONALIZA LA MARCA ---- */
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

        .titulo { font-size: 22px; font-weight: 700; margin: 16px 0 8px 0; }
        .subtitulo { font-size: 14px; color: var(--texto-secundario); line-height: 1.5; margin: 0 0 24px 0; }

        .campo-telefono {
          display: flex;
          gap: 8px;
          background: var(--superficie);
          border: 1px solid var(--acento);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
        }

        .selector-pais {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--texto-principal);
          font-size: 15px;
          padding: 0 10px;
          cursor: pointer;
          font-family: var(--fuente);
        }

        .input-telefono {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--texto-principal);
          font-size: 16px;
          padding: 12px 8px;
          font-family: var(--fuente);
        }

        .input-telefono::placeholder { color: var(--texto-secundario); }
        .input-telefono:focus { outline: none; }

        .mensaje-error { font-size: 13px; color: #ff6b6b; min-height: 18px; margin: -16px 0 16px 0; }

        .boton-secundario {
          width: 100%;
          height: 50px;
          border-radius: 25px;
          border: 1px solid var(--borde);
          background: var(--superficie);
          color: var(--texto-principal);
          font-size: 15px;
          font-family: var(--fuente);
          cursor: pointer;
          margin-bottom: 12px;
        }

        .boton-secundario:hover { background: #1f1f29; }

        .boton-primario {
          width: 100%;
          height: 50px;
          border-radius: 25px;
          border: none;
          background: var(--gris-desactivado, #2a2a35);
          color: var(--texto-secundario);
          font-size: 15px;
          font-weight: 600;
          font-family: var(--fuente);
          cursor: not-allowed;
        }

        .boton-primario:not(:disabled) {
          background: var(--acento);
          color: #ffffff;
          cursor: pointer;
        }

        .boton-primario:not(:disabled):hover { opacity: 0.9; }
      </style>

      <h1 class="titulo">${this._titulo}</h1>
      <p class="subtitulo">${this._subtitulo}</p>

      <div class="campo-telefono">
        <button type="button" class="selector-pais">
          <span>${this._bandera}</span>
          <span>${this._codigoPais}</span>
        </button>
        <input type="tel" id="telefono" class="input-telefono" placeholder="${this._placeholder}" inputmode="numeric" />
      </div>

      <p class="mensaje-error" id="mensajeError"></p>

      <button type="button" class="boton-secundario" id="btnCorreo">${this._textoCorreo}</button>
      <button type="button" class="boton-primario" id="btnContinuar" disabled>${this._textoBoton}</button>
    `;

    this._input = this.shadowRoot.getElementById("telefono");
    this._boton = this.shadowRoot.getElementById("btnContinuar");
    this._btnCorreo = this.shadowRoot.getElementById("btnCorreo");
    this._mensajeError = this.shadowRoot.getElementById("mensajeError");
  }

  _bindEvents() {
    this._input.addEventListener("input", () => {
      const digitos = this._input.value.replace(/\D/g, "").slice(0, this._minDigitos);
      this._input.value = digitos.replace(/(\d{3})(\d{3})(\d{0,4})/, (m, a, b, c) => (c ? `${a} ${b} ${c}` : b ? `${a} ${b}` : a));
      this._boton.disabled = digitos.length !== this._minDigitos;
      this.clearError();
    });

    this._boton.addEventListener("click", () => {
      if (this._boton.disabled) return;
      const digitos = this._input.value.replace(/\D/g, "");
      this.dispatchEvent(new CustomEvent("continue", {
        detail: { telefono: this._input.value, telefonoCompleto: `${this._codigoPais}${digitos}` },
        bubbles: true, composed: true,
      }));
    });

    this._btnCorreo.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("login-correo", { bubbles: true, composed: true }));
    });
  }

  setError(mensaje) {
    this._mensajeError.textContent = mensaje;
  }

  clearError() {
    this._mensajeError.textContent = "";
  }
}

customElements.define("phone-login-dark", PhoneLoginDark);
