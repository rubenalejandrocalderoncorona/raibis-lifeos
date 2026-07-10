import { mount as svelteMount, unmount as svelteUnmount } from 'svelte';
import CheckboxProp from './CheckboxProp.svelte';
import TextProp from './TextProp.svelte';
import DateProp from './DateProp.svelte';
import SelectProp from './SelectProp.svelte';
import RelationProp from './RelationProp.svelte';
import MultiSelectProp from './MultiSelectProp.svelte';
import RollupProp from './RollupProp.svelte';

// Exposed as a plain global so the existing vanilla-JS app (app.js) can
// mount/unmount Svelte components into specific DOM nodes without either
// side needing to know about the other's module system. This is the
// coexistence pattern for the migration: app.js keeps owning routing,
// data-fetching, and page-level rendering; individual controls get
// upgraded to Svelte components one at a time.
function mountCheckboxProp(target, props) {
  return svelteMount(CheckboxProp, { target, props });
}

function mountTextProp(target, props) {
  return svelteMount(TextProp, { target, props });
}

function mountDateProp(target, props) {
  return svelteMount(DateProp, { target, props });
}

function mountSelectProp(target, props) {
  return svelteMount(SelectProp, { target, props });
}

function mountRelationProp(target, props) {
  return svelteMount(RelationProp, { target, props });
}

function mountMultiSelectProp(target, props) {
  return svelteMount(MultiSelectProp, { target, props });
}

function mountRollupProp(target, props) {
  return svelteMount(RollupProp, { target, props });
}

window.RaibisSvelte = window.RaibisSvelte || {};
window.RaibisSvelte.mountCheckboxProp = mountCheckboxProp;
window.RaibisSvelte.mountTextProp = mountTextProp;
window.RaibisSvelte.mountDateProp = mountDateProp;
window.RaibisSvelte.mountSelectProp = mountSelectProp;
window.RaibisSvelte.mountRelationProp = mountRelationProp;
window.RaibisSvelte.mountMultiSelectProp = mountMultiSelectProp;
window.RaibisSvelte.mountRollupProp = mountRollupProp;
window.RaibisSvelte.unmount = svelteUnmount;
