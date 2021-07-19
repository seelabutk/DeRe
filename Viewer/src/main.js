import { createApp } from 'vue'
import App from './App.vue'
import mitt from 'mitt'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCopy, faTrash, faPlusSquare, faCut, faPaste, faBorderNone, faSave, faFile } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faCopy, faTrash, faPlusSquare, faCut, faPaste, faBorderNone, faSave, faFile);

const emitter = mitt();
const app = createApp(App);
app.config.globalProperties.emitter = emitter;
app.component('font-awesome-icon', FontAwesomeIcon);
app.mount('#app');
