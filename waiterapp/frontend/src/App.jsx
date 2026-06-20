import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Users, DollarSign, Layers, CheckCircle2, Clock, HelpCircle, Utensils, X } from 'lucide-react';

const API_URL = "https://waiter-app-0yhi.onrender.com"; // ЗАМІНИТИ ПІСЛЯ ДЕПЛОЮ БЕКЕНДУ

const MENU_ITEMS = [
  { name: "Стейк Рібай", price: 850, category: "Кухня", allergens: ["Глютен"] },
  { name: "Суп Том Ям", price: 390, category: "Кухня", allergens: ["Морепродукти", "Гостріше"] },
  { name: "Aperol Spritz", price: 250, category: "Бар", allergens: [] },
  { name: "Кава Латте", price: 90, category: "Бар", allergens: ["Лактоза"] }
];

export default function App() {
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeZone, setActiveZone] = useState('Головний зал');
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [splitCount, setSplitCount] = useState(1);

  // Форма нової резервації
  const [newRes, setNewRes] = useState({ guestName: '', phone: '', time: '', guestsCount: 2, comment: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const resTables = await fetch(`${API_URL}/tables`);
      const dataTables = await resTables.json();
      setTables(dataTables);

      const resRes = await fetch(`${API_URL}/reservations`);
      const dataRes = await resRes.json();
      setReservations(dataRes);
    } catch (err) {
      console.log("Помилка з'єднання з API, увімкнено офлайн-режим.");
    }
  };

  const handleSelectTable = async (table) => {
    setSelectedTable(table);
    if (table.isOccupied && table.activeReceipt) {
      const res = await fetch(`${API_URL}/receipts/${table.activeReceipt}`);
      const receipt = await res.json();
      setActiveReceipt(receipt);
    } else {
      setActiveReceipt(null);
    }
  };

  const createReceipt = async () => {
    const res = await fetch(`${API_URL}/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: selectedTable._id, items: [], totalSum: 0 })
    });
    const receipt = await res.json();
    
    const resTable = await fetch(`${API_URL}/tables/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedTable._id, isOccupied: true, receiptId: receipt._id })
    });
    const updatedTable = await resTable.json();

    setSelectedTable(updatedTable);
    setActiveReceipt(receipt);
    fetchData();
  };

  const addDishToReceipt = async (dish) => {
    if (!activeReceipt) return;
    const updatedItems = [...activeReceipt.items, { name: dish.name, price: dish.price, status: 'Нове' }];
    const total = updatedItems.reduce((sum, item) => sum + item.price, 0);

    const res = await fetch(`${API_URL}/receipts/${activeReceipt._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: updatedItems, totalSum: total })
    });
    const data = await res.json();
    setActiveReceipt(data);
  };

  const cycleItemStatus = async (itemIndex) => {
    const statuses = ['Нове', 'На кухні', 'Видане'];
    const currentStatus = activeReceipt.items[itemIndex].status;
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    
    const updatedItems = [...activeReceipt.items];
    updatedItems[itemIndex].status = nextStatus;

    const res = await fetch(`${API_URL}/receipts/${activeReceipt._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: updatedItems })
    });
    const data = await res.json();
    setActiveReceipt(data);
  };

  const closeReceipt = async (method) => {
    await fetch(`${API_URL}/receipts/${activeReceipt._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed', paymentMethod: method })
    });
    await fetch(`${API_URL}/tables/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedTable._id, isOccupied: false, receiptId: null })
    });
    setSelectedTable(null);
    setActiveReceipt(null);
    fetchData();
  };

  const addReservation = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newRes, tableId: selectedTable._id })
    });
    setNewRes({ guestName: '', phone: '', time: '', guestsCount: 2, comment: '' });
    fetchData();
  };

  return (
    <div class="max-w-md mx-auto bg-slate-900 min-h-screen pb-24 shadow-xl text-slate-100 font-sans">
      {/* Header */}
      <header class="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-blue-400">Las Woda</h1>
          <p class="text-xs text-slate-400">Особистий POS-асистент</p>
        </div>
        <div class="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-medium">Онлайн</div>
      </header>

      {/* Зони */}
      <div class="flex p-2 bg-slate-950 gap-1 border-b border-slate-800">
        {['Головний зал', 'Тераса', 'SPA / Басейн'].map(zone => (
          <button 
            key={zone}
            onClick={() => setActiveZone(zone)}
            class={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${activeZone === zone ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            {zone}
          </button>
        ))}
      </div>

      {/* Карта столів */}
      <main class="p-4">
        <div class="grid grid-cols-3 gap-4">
          {tables.filter(t => t.zone === activeZone).map(table => {
            const hasRes = reservations.some(r => r.tableId === table._id);
            return (
              <button
                key={table._id}
                onClick={() => handleSelectTable(table)}
                class={`relative h-24 rounded-xl flex flex-col items-center justify-center font-bold text-lg transition-all border ${
                  table.isOccupied 
                    ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-md' 
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <span>Стіл {table.number}</span>
                {table.isOccupied && <span class="text-[10px] uppercase font-normal tracking-wider opacity-80 mt-1">Зайнятий</span>}
                {!table.isOccupied && <span class="text-[10px] uppercase font-normal tracking-wider opacity-40 mt-1">Вільний</span>}
                
                {/* Індикатор резерву (без зміни кольору столу) */}
                {hasRes && (
                  <span class="absolute top-2 right-2 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse shadow"></span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Drawer / Вікно столу */}
      {selectedTable && (
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center transition-all animate-fade-in" onClick={() => setSelectedTable(null)}>
          <div class="bg-slate-950 border-t border-slate-800 w-full max-w-md rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-extrabold text-white">Стіл {selectedTable.number} <span class="text-sm font-normal text-slate-400">({selectedTable.zone})</span></h2>
              <button onClick={() => setSelectedTable(null)} class="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X size={20} /></button>
            </div>

            {/* СПИСОК РЕЗЕРВАЦІЙ */}
            <div class="mb-6">
              <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><Calendar size={16} /> Резервації на сьогодні</h3>
              <div class="space-y-2">
                {reservations.filter(r => r.tableId === selectedTable._id).map(res => (
                  <div key={res._id} class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                      <p class="font-bold text-slate-200">{res.time} — {res.guestName}</p>
                      <p class="text-xs text-slate-400">{res.phone} • {res.guestsCount} чол</p>
                      {res.comment && <p class="text-xs italic text-yellow-500/90 mt-1">💬 {res.comment}</p>}
                    </div>
                    <button 
                      onClick={async () => { await fetch(`${API_URL}/reservations/${res._id}`, { method: 'DELETE' }); fetchData(); }}
                      class="text-xs text-red-400 hover:bg-red-500/10 px-2 py-1.5 rounded-lg border border-red-500/20"
                    >
                      Видалити
                    </button>
                  </div>
                ))}
                {reservations.filter(r => r.tableId === selectedTable._id).length === 0 && (
                  <p class="text-xs text-slate-500 italic">Немає запланованих резервів.</p>
                )}
              </div>

              {/* Форма додавання резерву */}
              <form onSubmit={addReservation} class="mt-4 grid grid-cols-2 gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <input type="text" placeholder="Ім'я" required value={newRes.guestName} onChange={e => setNewRes({...newRes, guestName: e.target.value})} class="bg-slate-800 text-xs rounded-lg p-2 border border-slate-700 outline-none focus:border-blue-500" />
                <input type="text" placeholder="Телефон" required value={newRes.phone} onChange={e => setNewRes({...newRes, phone: e.target.value})} class="bg-slate-800 text-xs rounded-lg p-2 border border-slate-700 outline-none focus:border-blue-500" />
                <input type="time" required value={newRes.time} onChange={e => setNewRes({...newRes, time: e.target.value})} class="bg-slate-800 text-xs rounded-lg p-2 border border-slate-700 outline-none focus:border-blue-500" />
                <input type="number" placeholder="Гостей" required value={newRes.guestsCount} onChange={e => setNewRes({...newRes, guestsCount: e.target.value})} class="bg-slate-800 text-xs rounded-lg p-2 border border-slate-700 outline-none focus:border-blue-500" />
                <input type="text" placeholder="Коментар / Алергени" value={newRes.comment} onChange={e => setNewRes({...newRes, comment: e.target.value})} class="bg-slate-800 text-xs rounded-lg p-2 border border-slate-700 outline-none focus:border-blue-500 col-span-2" />
                <button type="submit" class="bg-slate-800 hover:bg-slate-700 text-xs text-blue-400 font-bold p-2 rounded-lg col-span-2 transition-colors border border-blue-500/20">➕ Додати бронь</button>
              </form>
            </div>

            <hr class="border-slate-800 my-6" />

            {/* ЧЕК СТОЛУ */}
            {!selectedTable.isOccupied ? (
              <button 
                onClick={createReceipt}
                class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/10 text-center block tracking-wide transition-all"
              >
                ➕ Додати чек
              </button>
            ) : (
              <div>
                <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><Utensils size={16} /> Активне замовлення</h3>
                
                {/* Позиції в чеку */}
                <div class="space-y-2 max-h-48 overflow-y-auto pr-1 mb-4">
                  {activeReceipt?.items.map((item, index) => (
                    <div key={index} class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex justify-between items-center">
                      <div>
                        <p class="font-medium text-slate-200 text-sm">{item.name}</p>
                        <p class="text-xs font-bold text-slate-400">{item.price} PLN</p>
                      </div>
                      
                      {/* Канбан-прапорці (Нове -> На кухні -> Видане) */}
                      <button 
                        onClick={() => cycleItemStatus(index)}
                        class={`text-xs px-3 py-1.5 font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                          item.status === 'Нове' ? 'bg-slate-800 border border-slate-700 text-slate-400' :
                          item.status === 'На кухні' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' :
                          'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {item.status === 'Нове' && <Clock size={12} />}
                        {item.status === 'На кухні' && <Layers size={12} />}
                        {item.status === 'Видане' && <CheckCircle2 size={12} />}
                        {item.status}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Швидке меню для додавання */}
                <p class="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wider">Швидке меню:</p>
                <div class="grid grid-cols-2 gap-1.5 mb-6">
                  {MENU_ITEMS.map(dish => (
                    <button 
                      key={dish.name}
                      onClick={() => addDishToReceipt(dish)}
                      class="bg-slate-900 border border-slate-800 hover:border-slate-700 p-2 rounded-xl text-left transition-all active:scale-[0.98]"
                    >
                      <p class="text-xs font-bold text-slate-300 truncate">{dish.name}</p>
                      <p class="text-[10px] text-blue-400 font-semibold">{dish.price} PLN</p>
                    </button>
                  ))}
                </div>

                {/* Розділення рахунку */}
                <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 mb-6 flex justify-between items-center">
                  <div>
                    <p class="text-xs font-semibold text-slate-400">Розділити рахунок</p>
                    <p class="text-xs text-slate-500">По {Math.round((activeReceipt?.totalSum || 0) / splitCount)} PLN</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-300">-</button>
                    <span class="font-bold text-sm px-2 text-white">{splitCount}</span>
                    <button onClick={() => setSplitCount(splitCount + 1)} class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-300">+</button>
                  </div>
                </div>

                {/* Разом */}
                <div class="flex justify-between items-center mb-6 px-1">
                  <span class="text-sm font-semibold text-slate-400">Загальна сума:</span>
                  <span class="text-xl font-black text-white">{activeReceipt?.totalSum || 0} PLN</span>
                </div>

                {/* Кнопки закриття */}
                <p class="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wider text-center">Закрити чек / Оплата:</p>
                <div class="grid grid-cols-3 gap-2">
                  <button onClick={() => closeReceipt('Готівка')} class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors">💵 Готівка</button>
                  <button onClick={() => closeReceipt('Термінал')} class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors">💳 Картка</button>
                  <button onClick={() => closeReceipt('Кімната')} class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors">🏨 На Номер</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
