import { KanbanBoardView } from "@/components/leads/kanban-board";

export default function LeadsPage() {
    return (
        <div className="flex-1 min-h-full" style={{ background: "#EFF3F8" }}>
            <div className="px-8 py-7">
                <KanbanBoardView />
            </div>
        </div>
    );
}
