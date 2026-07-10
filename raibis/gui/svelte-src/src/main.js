import { mount as svelteMount, unmount as svelteUnmount } from 'svelte';
import CheckboxProp from './CheckboxProp.svelte';

// Exposed as a plain global so the existing vanilla-JS app (app.js) can
// mount/unmount Svelte components into specific DOM nodes without either
// side needing to know about the other's module system. This is the
// coexistence pattern for the migration: app.js keeps owning routing,
// data-fetching, and page-level rendering; individual controls get
// upgraded to Svelte components one at a time.
function mountCheckboxProp(target, props) {
  return svelteMount(CheckboxProp, { target, props });
}

window.RaibisSvelte = window.RaibisSvelte || {};
window.RaibisSvelte.mountCheckboxProp = mountCheckboxProp;
window.RaibisSvelte.unmount = svelteUnmount;
