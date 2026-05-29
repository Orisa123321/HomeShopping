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
      {/* פה אנחנו מוסיפים את ה-listeners רק לאזור הגרירה כדי לא להפריע ללחיצות */}
      <div className="drag-handle" {...attributes} {...listeners}>
        ⠿ {/* אייקון גרירה */}
      </div>
      <ItemCard {...props} />
    </div>
  );
}
