import { computed, h, ref, onMounted, onUpdated, onBeforeUnmount } from "vue";
import CardItem from "./CardItem.vue";
import type { Card } from "@/types";

const CardTree = {
  name: "CardTree",
  props: {
    card: { type: Object as () => Card, required: true },
    depth: { type: Number, required: true },
    parentColumnId: { type: String, required: true },
    allCards: { type: Array as () => Card[], required: true },
    columns: {
      type: Array as () => { id: string; name: string }[],
      required: true,
    },
    isDragging: { type: Boolean, required: true },
    draggedCardId: { type: String, default: null },
    dragOverCardId: { type: String, default: null },
    showColumnBadge: { type: Boolean, default: true },
    registerCard: { type: Function, required: true },
    registerTree: { type: Function, default: null },
  },
  emits: [
    "pointerDown",
    "pointerMove",
    "pointerUp",
    "cardClick",
    "cardDoubleClick",
  ],
  setup(props: any, { emit }: any) {
    const treeEl = ref<HTMLElement | null>(null);

    const children = computed(() =>
      props.allCards
        .filter((c: Card) => c.parent_id === props.card.id && !c.archived)
        .sort((a: Card, b: Card) => (a.order ?? "").localeCompare(b.order ?? "")),
    );

    function registerTreeEl() {
      if (props.registerTree && treeEl.value) {
        props.registerTree(props.card.id, treeEl.value);
      }
    }

    onMounted(registerTreeEl);
    onUpdated(registerTreeEl);
    onBeforeUnmount(() => {
      if (props.registerTree) {
        props.registerTree(props.card.id, null);
      }
    });

    return () =>
      h(
        "div",
        {
          ref: treeEl,
          class: [
            "space-y-1",
            { "border-l border-border-subtle pl-2": props.depth > 0 },
          ],
        },
        [
          h(CardItem, {
            ref: (el: any) => {
              if (el?.$el) props.registerCard(props.card.id, el.$el);
            },
            card: props.card,
            depth: props.depth,
            isDragging: props.isDragging,
            draggedCardId: props.draggedCardId,
            childCount: children.value.length,
            parentColumnId: props.parentColumnId,
            columns: props.columns,
            showColumnBadge: props.showColumnBadge,
            onPointerDown: (card: Card, event: PointerEvent) =>
              emit("pointerDown", card, event),
            onPointerMove: (event: PointerEvent) => emit("pointerMove", event),
            onPointerUp: (event: PointerEvent) => emit("pointerUp", event),
            onClick: (card: Card) => emit("cardClick", card),
            onDoubleClick: (card: Card) => emit("cardDoubleClick", card),
          }),
          ...children.value.map((child: Card) =>
            h(CardTree, {
              key: child.id,
              card: child,
              depth: props.depth + 1,
              parentColumnId: child.column_id,
              allCards: props.allCards,
              columns: props.columns,
              isDragging: props.isDragging,
              draggedCardId: props.draggedCardId,
              dragOverCardId: props.dragOverCardId,
              showColumnBadge: props.showColumnBadge,
              registerCard: props.registerCard,
              registerTree: props.registerTree,
              onPointerDown: (card: Card, event: PointerEvent) =>
                emit("pointerDown", card, event),
              onPointerMove: (event: PointerEvent) =>
                emit("pointerMove", event),
              onPointerUp: (event: PointerEvent) => emit("pointerUp", event),
              onCardClick: (card: Card) => emit("cardClick", card),
              onCardDoubleClick: (card: Card) => emit("cardDoubleClick", card),
            }),
          ),
        ],
      );
  },
};

export default CardTree;
