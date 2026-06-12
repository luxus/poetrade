<script lang="ts">
  /** Renders trusted, non-user HTML (icons, extension-generated markup). */
  export let html: string;
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted internal markup only; never bind user input here -->
{@html html}