class VaaS_Visint extends VaaS_Base {
    constructor() {
        super();
        const template = document.createElement('template');
        template.innerHTML = `
        <style>
          :host {
            width: 100%;
            height: auto;
          }
          .container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
          }
          iframe {
            width: 100%;
            height: 100%;
          }
        </style>
        <iframe src="../visint/dist/index.html"></iframe>
        `;
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.type = 'chart';
        this.service = this.vaas.get_service(this.type);
    }
}
customElements.define('vaas-visint', VaaS_Visint);