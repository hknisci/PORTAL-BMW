import React from "react";

interface PlaceholderTableProps {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  onClick?: () => void;
  emptyMessage?: string;
}

const PlaceholderTable: React.FC<PlaceholderTableProps> = ({
  title,
  headers,
  rows,
  onClick,
  emptyMessage,
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (!safeRows.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
        <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg p-6 text-center">
          {emptyMessage || "No data"}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col" className="px-4 py-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row, index) => (
              <tr key={index} className="bg-white border-b last:border-b-0 hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlaceholderTable;