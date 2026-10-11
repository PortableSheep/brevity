<script lang="ts">
  import { onMount, untrack } from "svelte";
  let { initialText }: { initialText: string } = $props();
  let length = $state(untrack(() => initialText.length));
  onMount(() => {
    const field = document.querySelector<HTMLTextAreaElement>('textarea[name="text"]');
    if (!field) throw new Error("Missing native note field");
    const update = () => { length = field.value.length; };
    update();
    field.addEventListener("input", update);
    return () => field.removeEventListener("input", update);
  });
</script>

<p id="note-counter" aria-live="polite">{length} / 200 characters</p>
