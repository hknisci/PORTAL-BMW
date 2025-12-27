import React from 'react';
import { ON_CALL_ROSTER_DATA } from '../constants';

const DutyRosterPage: React.FC = () => {
    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        // Add T00:00:00 to handle potential timezone issues and ensure correct date parsing
        return new Date(dateString + 'T00:00:00').toLocaleDateString('tr-TR', options);
    };

    const getTodayString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = getTodayString();

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Aylık Nöbet Listesi</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Tarih</th>
              <th scope="col" className="px-6 py-3">Ad Soyadı</th>
              <th scope="col" className="px-6 py-3">Telefon</th>
              <th scope="col" className="px-6 py-3">Mail</th>
            </tr>
          </thead>
          <tbody>
            {ON_CALL_ROSTER_DATA.map((person, index) => (
              <tr key={index} className={`border-b hover:bg-gray-50 ${person.date === todayStr ? 'bg-blue-50 font-semibold text-blue-800' : 'bg-white'}`}>
                <td className="px-6 py-4">{formatDate(person.date)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{person.name}</td>
                <td className="px-6 py-4">{person.phone}</td>
                <td className="px-6 py-4">{person.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DutyRosterPage;
