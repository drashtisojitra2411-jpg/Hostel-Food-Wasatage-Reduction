export default function DataTable({ columns, rows, renderCell, emptyMessage = 'No data found.', toolbar = null }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 overflow-x-auto">
            {toolbar ? <div className="mb-4">{toolbar}</div> : null}
            {rows.length === 0 ? (
                <div className="text-center text-white/50 py-8">{emptyMessage}</div>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-white/50 uppercase tracking-widest text-[10px]">
                            {columns.map((col) => (
                                <th key={col.key} className="p-3">{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row.id || idx} className="border-t border-white/10">
                                {columns.map((col) => (
                                    <td key={`${col.key}-${row.id || idx}`} className="p-3">
                                        {renderCell ? renderCell(row, col.key) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
