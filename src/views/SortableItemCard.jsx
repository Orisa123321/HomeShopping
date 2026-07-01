import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ItemCard } from "../components/ItemCard";

export function SortableItemCard(props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="drag-handle"
        {...attributes}
        {...listeners}
        style={{ touchAction: "none" }}
      >
        ⠿
      </div>
      <ItemCard {...props} />
    </div>
  );
}
