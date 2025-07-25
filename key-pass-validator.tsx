import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Send, Key, Lock, UserPlus, Users, Plus, Edit, Trash2 } from 'lucide-react';

// Custom Modal Component
const Modal = ({ show, title, message, onConfirm, onCancel, type = 'alert', inputValue = '', onInputChange }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
        <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        {type === 'prompt' && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            placeholder="กรอกชื่อใหม่"
          />
        )}
        <div className="flex justify-end gap-3">
          {type !== 'alert' && (
            <button
              onClick={onCancel}
              className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              ยกเลิก
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-lg transition-colors font-medium ${
              type === 'alert' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Date Utility Functions ---

// Function to check if a string matches DD/MM/YY or DD/MM/YYYY format
const isValidDateStringFormat = (dateString) => {
  // Regex for DD/MM/YY or DD/MM/YYYY
  const regex = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/;
  return regex.test(dateString);
};

// Function to parse DD/MM/YYYY (or YY) Thai year to YYYY-MM-DD Gregorian
const parseThaiDateToISO = (dateString) => {
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;

  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  // Convert Thai year (BE) to Gregorian year (AD) if it's a 2-digit or 4-digit BE year
  if (year < 100) { // Assume 2-digit year is BE, e.g., 68 for 2568
      year += 2500; // Convert 68 to 2568
  }
  if (year >= 2500) { // If it's a 4-digit BE year (e.g., 2568)
      year -= 543; // Convert to Gregorian (2025)
  }

  // Basic date validity check
  // Note: Month is 0-indexed in JavaScript Date object
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return null; // Invalid date (e.g., 31/02/2024)
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Function to format YYYY-MM-DD Gregorian to DD/MM/YYYY Thai year
const formatISOToThaiDate = (isoDateString) => {
  // Check if it's already in DD/MM/YYYY format (meaning it was not an ISO date)
  if (isValidDateStringFormat(isoDateString) && isoDateString.split('/')[2].length === 4 && parseInt(isoDateString.split('/')[2], 10) >= 2500) {
    return isoDateString; // Already in Thai date format
  }

  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return isoDateString; // Not a valid date string or not an ISO date string

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543; // Convert Gregorian to Thai year (BE)

  return `${day}/${month}/${year}`;
};

// --- End Date Utility Functions ---


const KeyPassValidator = () => {
  // State for Add User section
  const [senderReceiver, setSenderReceiver] = useState('');

  // State for Send Data section
  const [sendFrom, setSendFrom] = useState('');
  const [sendType, setSendType] = useState(''); // key or pass
  const [sendTo, setSendTo] = useState('');
  const [sendData, setSendData] = useState('');

  // State for Data Storage and Validation
  const [userList, setUserList] = useState([]);
  // dataStorage structure: { receiver: { keys: { sender: [key1, key2] }, passes: { sender: [pass1] } } }
  const [dataStorage, setDataStorage] = useState({});
  const [validationResult, setValidationResult] = useState(null);

  // States for Custom Modals
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(() => () => {}); // Function to run on confirm

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptAction, setPromptAction] = useState(() => () => {}); // Function to run on prompt confirm
  const [editingUser, setEditingUser] = useState(null); // Stores the user name currently being edited

  // Function to show alert modal
  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  // Function to show confirmation modal
  const showCustomConfirm = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action); // Store the action to be executed
    setShowConfirmModal(true);
  };

  // Function to show prompt modal
  const showCustomPrompt = (message, initialValue, action) => {
    setPromptMessage(message);
    setPromptValue(initialValue);
    setPromptAction(() => action);
    setShowPromptModal(true);
  };

  // Add a new user
  const addUser = () => {
    const newUser = senderReceiver.trim();
    if (newUser && !userList.includes(newUser)) {
      setUserList(prev => [...prev, newUser]);
      // Initialize keys and passes as empty objects, ready to hold arrays for each sender
      setDataStorage(prev => ({
        ...prev,
        [newUser]: { keys: {}, passes: {} }
      }));
      setSenderReceiver('');
      showCustomAlert(`เพิ่มผู้ใช้ "${newUser}" สำเร็จ!`);
    } else if (userList.includes(newUser)) {
      showCustomAlert(`ผู้ใช้ "${newUser}" มีอยู่แล้ว`);
    } else {
      showCustomAlert('กรุณากรอกชื่อผู้ใช้');
    }
  };

  // Edit an existing user
  const editUser = (oldName) => {
    setEditingUser(oldName);
    showCustomPrompt(
      `เปลี่ยนชื่อผู้ใช้ "${oldName}" เป็น:`,
      oldName,
      (newName) => {
        const trimmedNewName = newName.trim();
        if (!trimmedNewName) {
          showCustomAlert('ชื่อผู้ใช้ใหม่ต้องไม่ว่างเปล่า');
          return false; // Indicate failure
        }
        if (trimmedNewName === oldName) {
          // No change, just close modal
          return true;
        }
        if (userList.includes(trimmedNewName)) {
          showCustomAlert('ชื่อผู้ใช้นี้มีอยู่แล้ว');
          return false; // Indicate failure
        }

        // Update userList
        setUserList(prev => prev.map(user => (user === oldName ? trimmedNewName : user)));

        // Update dataStorage
        setDataStorage(prev => {
          const newStorage = {};
          // Iterate through all existing receivers
          for (const receiver in prev) {
            const currentReceiverData = prev[receiver];
            const newReceiverName = receiver === oldName ? trimmedNewName : receiver;
            
            // Initialize new receiver entry
            newStorage[newReceiverName] = { keys: {}, passes: {} };

            // Update keys: iterate through senders for this receiver
            for (const sender in currentReceiverData.keys) {
              const newSenderName = sender === oldName ? trimmedNewName : sender;
              // Copy the array of keys
              newStorage[newReceiverName].keys[newSenderName] = [...currentReceiverData.keys[sender]];
            }

            // Update passes: iterate through senders for this receiver
            for (const sender in currentReceiverData.passes) {
              const newSenderName = sender === oldName ? trimmedNewName : sender;
              // Copy the array of passes
              newStorage[newReceiverName].passes[newSenderName] = [...currentReceiverData.passes[sender]];
            }
          }
          return newStorage;
        });

        // Update sendFrom and sendTo if they were the old name
        if (sendFrom === oldName) setSendFrom(trimmedNewName);
        if (sendTo === oldName) setSendTo(trimmedNewName);

        showCustomAlert(`เปลี่ยนชื่อผู้ใช้จาก "${oldName}" เป็น "${trimmedNewName}" สำเร็จ!`);
        return true; // Indicate success
      }
    );
  };

  // Delete an existing user
  const deleteUser = (userToDelete) => {
    showCustomConfirm(
      `คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ "${userToDelete}"? ข้อมูลทั้งหมดที่เกี่ยวข้องกับผู้ใช้นี้จะถูกลบออกไปด้วย`,
      () => {
        // Remove from userList
        setUserList(prev => prev.filter(user => user !== userToDelete));

        // Remove from dataStorage (as receiver) and also as sender from other receivers
        setDataStorage(prev => {
          const newStorage = { ...prev };
          delete newStorage[userToDelete]; // Remove receiver entry for userToDelete

          // Iterate through remaining receivers to remove userToDelete as a sender
          for (const receiver in newStorage) {
            if (newStorage[receiver].keys) {
              const newKeys = { ...newStorage[receiver].keys };
              if (newKeys[userToDelete]) {
                delete newKeys[userToDelete];
                newStorage[receiver].keys = newKeys;
              }
            }
            if (newStorage[receiver].passes) {
              const newPasses = { ...newStorage[receiver].passes };
              if (newPasses[userToDelete]) {
                delete newPasses[userToDelete];
                newStorage[receiver].passes = newPasses;
              }
            }
          }
          return newStorage;
        });

        // Reset sendFrom and sendTo if the deleted user was selected
        if (sendFrom === userToDelete) setSendFrom('');
        if (sendTo === userToDelete) setSendTo('');

        showCustomAlert(`ลบผู้ใช้ "${userToDelete}" สำเร็จ!`);
      }
    );
  };

  // Send Key or Pass data
  const sendKeyPass = () => {
    if (!sendFrom || !sendType || !sendTo || !sendData) {
      showCustomAlert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    let dataToStore = sendData.trim();
    let isDateData = false;
    let canonicalDate = null;

    // Check if the data looks like a date (DD/MM/YY or DD/MM/YYYY) and parse it
    if (isValidDateStringFormat(dataToStore)) {
      canonicalDate = parseThaiDateToISO(dataToStore);
      if (canonicalDate) {
        isDateData = true;
        dataToStore = canonicalDate; // Store in YYYY-MM-DD format internally for consistent comparison
      } else {
        showCustomAlert('รูปแบบวันที่ไม่ถูกต้อง กรุณากรอกในรูปแบบ DD/MM/YY หรือ DD/MM/YYYY (เช่น 05/07/68 หรือ 05/07/2568)');
        return;
      }
    }

    // If it's date data, check for duplicate date entries for the same sender-receiver-type triplet
    if (isDateData) {
      const existingDataArray = dataStorage[sendTo]?.[sendType === 'key' ? 'keys' : 'passes']?.[sendFrom] || [];
      const isDuplicateDate = existingDataArray.some(item => item === dataToStore); // Compare canonical date strings

      if (isDuplicateDate) {
        showCustomAlert(`ไม่สามารถบันทึกข้อมูลวันที่ซ้ำได้! วันที่ "${formatISOToThaiDate(dataToStore)}" มีอยู่แล้วสำหรับผู้ส่ง "${sendFrom}" ถึงผู้รับ "${sendTo}"`);
        return;
      }
    }

    // Update data in storage: Always add to the array
    setDataStorage(prev => {
      const updated = { ...prev };
      // Ensure the receiver exists
      if (!updated[sendTo]) {
        updated[sendTo] = { keys: {}, passes: {} };
      }

      const targetType = sendType === 'key' ? 'keys' : 'passes';
      // Ensure the sender's array exists for this receiver and type
      if (!updated[sendTo][targetType][sendFrom]) {
        updated[sendTo][targetType][sendFrom] = [];
      }

      // Add the new data to the array
      updated[sendTo][targetType][sendFrom].push(dataToStore);
      return updated;
    });

    showCustomAlert(`ส่ง ${sendType} "${isDateData ? formatISOToThaiDate(dataToStore) : sendData}" จาก ${sendFrom} ไป ${sendTo} สำเร็จ!`);

    // Reset form
    setSendFrom('');
    setSendType('');
    setSendTo('');
    setSendData('');
  };

  // Validate all data
  const validateAllData = () => {
    if (userList.length === 0) {
      showCustomAlert('ไม่มีข้อมูลผู้ใช้ให้ตรวจสอบ');
      return;
    }

    const duplicates = []; // Stores values that appear more than once across all entries
    const conflicts = []; // This array is currently not populated based on the logic, but kept for future expansion.
    const allKeys = {}; // { value: [{ receiver, sender, type }, ...] }
    const allPasses = {}; // { value: [{ receiver, sender, type }, ...] }
    let totalKeys = 0;
    let totalPasses = 0;
    let totalComparisons = 0;

    // Collect all data by iterating through each receiver, then each sender's array of keys/passes
    userList.forEach(receiver => {
      if (dataStorage[receiver]) {
        // Check Keys
        Object.entries(dataStorage[receiver].keys).forEach(([sender, keyArray]) => {
          keyArray.forEach(key => { // Iterate over the array of keys for this sender
            totalKeys++;
            totalComparisons++;

            if (!allKeys[key]) {
              allKeys[key] = [];
            }
            allKeys[key].push({ receiver, sender, type: 'key' });
          });
        });

        // Check Passes
        Object.entries(dataStorage[receiver].passes).forEach(([sender, passArray]) => {
          passArray.forEach(pass => { // Iterate over the array of passes for this sender
            totalPasses++;
            totalComparisons++;

            if (!allPasses[pass]) {
              allPasses[pass] = [];
            }
            allPasses[pass].push({ receiver, sender, type: 'pass' });
          });
        });
      }
    });

    // Find duplicate values across the system (a value appearing more than once in allKeys or allPasses)
    Object.entries(allKeys).forEach(([value, items]) => {
      if (items.length > 1) {
        duplicates.push({
          type: 'Key',
          value,
          receivers: [...new Set(items.map(item => item.receiver))], // Unique receivers
          senders: [...new Set(items.map(item => item.sender))] // Unique senders
        });
      }
    });

    Object.entries(allPasses).forEach(([value, items]) => {
      if (items.length > 1) {
        duplicates.push({
          type: 'Pass',
          value,
          receivers: [...new Set(items.map(item => item.receiver))], // Unique receivers
          senders: [...new Set(items.map(item => item.sender))] // Unique senders
        });
      }
    });

    setValidationResult({
      hasConflicts: duplicates.length > 0 || conflicts.length > 0,
      duplicates,
      conflicts,
      totalUsers: userList.length,
      totalKeys,
      totalPasses,
      totalComparisons
    });
  };

  // Reset all states
  const resetAll = () => {
    showCustomConfirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลทั้งหมด?', () => {
      setSenderReceiver('');
      setSendFrom('');
      setSendType('');
      setSendTo('');
      setSendData('');
      setUserList([]);
      setDataStorage({});
      setValidationResult(null);
      showCustomAlert('รีเซ็ตข้อมูลทั้งหมดเรียบร้อยแล้ว!');
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 font-inter">
      {/* Alert Modal */}
      <Modal
        show={showAlertModal}
        title="แจ้งเตือน"
        message={alertMessage}
        onConfirm={() => setShowAlertModal(false)}
        type="alert"
      />

      {/* Confirmation Modal */}
      <Modal
        show={showConfirmModal}
        title="ยืนยัน"
        message={confirmMessage}
        onConfirm={() => {
          confirmAction();
          setShowConfirmModal(false);
        }}
        onCancel={() => setShowConfirmModal(false)}
        type="confirm"
      />

      {/* Prompt Modal */}
      <Modal
        show={showPromptModal}
        title="แก้ไขชื่อผู้ใช้"
        message={promptMessage}
        inputValue={promptValue}
        onInputChange={setPromptValue}
        onConfirm={() => {
          const success = promptAction(promptValue);
          if (success) {
            setShowPromptModal(false);
            setEditingUser(null);
          }
        }}
        onCancel={() => {
          setShowPromptModal(false);
          setEditingUser(null);
        }}
        type="prompt"
      />

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
              Key & Pass Validation App
            </h1>
            <p className="text-gray-600 text-lg">ระบบจัดการและตรวจสอบ Key และ Pass</p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">

            {/* Section 1: Add ผู้รับ/ผู้ส่ง */}
            <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200 shadow-sm">
              <h2 className="text-2xl font-semibold text-green-800 mb-4 flex items-center">
                <UserPlus className="w-6 h-6 mr-3" />
                เพิ่มผู้รับ/ผู้ส่ง
              </h2>

              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label htmlFor="user-input" className="sr-only">กรอกชื่อหรือรหัสผู้ใช้</label>
                  <input
                    id="user-input"
                    type="text"
                    value={senderReceiver}
                    onChange={(e) => setSenderReceiver(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                    placeholder="กรอกชื่อหรือรหัสผู้ใช้"
                  />
                </div>
                <button
                  onClick={addUser}
                  className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-md transform hover:scale-105"
                >
                  <Plus className="inline-block w-5 h-5 mr-2" /> เพิ่ม
                </button>
              </div>

              {/* Display User List */}
              {userList.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-green-800 mb-3 text-lg flex items-center">
                    <Users className="w-5 h-5 mr-2" /> รายชื่อผู้ใช้:
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {userList.map((user, index) => (
                      <div
                        key={index}
                        className="bg-white px-4 py-2 rounded-full text-base border border-green-300 flex items-center shadow-sm"
                      >
                        <span className="mr-3">{user}</span>
                        <button
                          onClick={() => editUser(user)}
                          className="text-blue-500 hover:text-blue-700 mr-2 p-1 rounded-full hover:bg-blue-100 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: ส่งข้อมูล */}
            <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200 shadow-sm">
              <h2 className="text-2xl font-semibold text-blue-800 mb-4 flex items-center">
                <Send className="w-6 h-6 mr-3" />
                ส่งข้อมูล
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* ส่งจาก */}
                <div>
                  <label htmlFor="send-from" className="block text-base font-medium text-gray-700 mb-2">
                    ส่งจาก
                  </label>
                  <select
                    id="send-from"
                    value={sendFrom}
                    onChange={(e) => setSendFrom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  >
                    <option value="">เลือก</option>
                    {userList.map((user, index) => (
                      <option key={index} value={user}>{user}</option>
                    ))}
                  </select>
                </div>

                {/* Key/Pass */}
                <div>
                  <label htmlFor="send-type" className="block text-base font-medium text-gray-700 mb-2">
                    Key/Pass
                  </label>
                  <select
                    id="send-type"
                    value={sendType}
                    onChange={(e) => setSendType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  >
                    <option value="">เลือก</option>
                    <option value="key">Key</option>
                    <option value="pass">Pass</option>
                  </select>
                </div>

                {/* ผู้รับ */}
                <div>
                  <label htmlFor="send-to" className="block text-base font-medium text-gray-700 mb-2">
                    ผู้รับ
                  </label>
                  <select
                    id="send-to"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  >
                    <option value="">เลือก</option>
                    {userList.map((user, index) => (
                      <option key={index} value={user}>{user}</option>
                    ))}
                  </select>
                </div>

                {/* ข้อมูล */}
                <div>
                  <label htmlFor="send-data" className="block text-base font-medium text-gray-700 mb-2">
                    ข้อมูล <span className="text-gray-500 text-sm">(เช่น 05/07/2568)</span>
                  </label>
                  <input
                    id="send-data"
                    type="text" // Keep as text to allow custom date format input
                    value={sendData}
                    onChange={(e) => setSendData(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="ค่าที่ส่ง หรือ DD/MM/YYYY"
                  />
                </div>

                {/* ปุ่มส่ง */}
                <div className="flex items-end">
                  <button
                    onClick={sendKeyPass}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-md transform hover:scale-105"
                  >
                    ส่ง
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: ตารางแสดงข้อมูล */}
            <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                ตารางแสดงข้อมูล
              </h2>

              <div className="overflow-x-auto rounded-lg border border-gray-300">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider rounded-tl-lg">ผู้รับ</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Keys จากผู้ส่ง</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider rounded-tr-lg">Passes จากผู้ส่ง</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userList.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-center text-gray-500 text-sm">
                          ยังไม่มีข้อมูลผู้ใช้
                        </td>
                      </tr>
                    ) : (
                      userList.map((user) => (
                        <tr key={user}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {dataStorage[user] && Object.keys(dataStorage[user].keys).length > 0 ? (
                              <div className="space-y-1">
                                {Object.entries(dataStorage[user].keys).map(([sender, keyArray]) => (
                                  <div key={sender} className="text-sm">
                                    <span className="font-medium text-gray-700">{sender}:</span>
                                    {keyArray.map((key, i) => (
                                      <span key={i} className="block pl-4">
                                        {/* Format key if it's an ISO date string */}
                                        {key && key.match(/^\d{4}-\d{2}-\d{2}$/) ? formatISOToThaiDate(key) : key}
                                      </span>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {dataStorage[user] && Object.keys(dataStorage[user].passes).length > 0 ? (
                              <div className="space-y-1">
                                {Object.entries(dataStorage[user].passes).map(([sender, passArray]) => (
                                  <div key={sender} className="text-sm">
                                    <span className="font-medium text-gray-700">{sender}:</span>
                                    {passArray.map((pass, i) => (
                                      <span key={i} className="block pl-4">
                                        {/* Format pass if it's an ISO date string */}
                                        {pass && pass.match(/^\d{4}-\d{2}-\d{2}$/) ? formatISOToThaiDate(pass) : pass}
                                      </span>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: ตรวจสอบ */}
            <div className="bg-purple-50 p-6 rounded-xl border-2 border-purple-200 shadow-sm">
              <h2 className="text-2xl font-semibold text-purple-800 mb-4 flex items-center">
                <CheckCircle className="w-6 h-6 mr-3" />
                ตรวจสอบข้อมูลทั้งหมด
              </h2>

              <div className="text-center">
                <button
                  onClick={validateAllData}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-3.5 rounded-lg font-bold transition-colors text-lg shadow-md transform hover:scale-105"
                >
                  ตรวจสอบผู้รับ ผู้ส่ง ทั้งหมด
                </button>
              </div>

              {/* Display Validation Results */}
              {validationResult && (
                <div className="mt-6 space-y-4">
                  {/* Summary */}
                  <div className={`p-4 rounded-lg border-2 text-center ${
                    validationResult.hasConflicts
                      ? 'bg-red-50 border-red-500'
                      : 'bg-green-50 border-green-500'
                  } shadow-sm`}>
                    <div className="flex items-center justify-center mb-2">
                      {validationResult.hasConflicts ? (
                        <XCircle className="w-9 h-9 text-red-500 mr-3" />
                      ) : (
                        <CheckCircle className="w-9 h-9 text-green-500 mr-3" />
                      )}
                      <span className={`text-3xl font-bold ${
                        validationResult.hasConflicts ? 'text-red-800' : 'text-green-800'
                      }`}>
                        {validationResult.hasConflicts ? 'พบข้อมูลที่ไม่ตรงกัน!' : 'ข้อมูลทั้งหมดตรงกัน!'}
                      </span>
                    </div>
                    <p className="text-base text-gray-600">
                      ตรวจสอบแล้ว {validationResult.totalComparisons} รายการ
                    </p>
                  </div>

                  {/* Display Duplicates */}
                  {validationResult.duplicates.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-500 shadow-sm">
                      <h4 className="font-bold text-yellow-800 mb-3 text-lg flex items-center">
                        <XCircle className="w-5 h-5 mr-2" />
                        ข้อมูลที่ซ้ำกัน:
                      </h4>
                      <div className="space-y-2">
                        {validationResult.duplicates.map((dup, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-yellow-300 shadow-sm">
                            <p className="font-medium text-yellow-800 text-base">
                              {dup.type} ที่ซ้ำ: "<span className="font-mono">
                                {/* Format duplicate value if it's an ISO date string */}
                                {dup.value && dup.value.match(/^\d{4}-\d{2}-\d{2}$/) ? formatISOToThaiDate(dup.value) : dup.value}
                              </span>"
                            </p>
                            <p className="text-sm text-gray-700">
                              พบในผู้รับ: <span className="font-semibold">{dup.receivers.join(', ')}</span> จากผู้ส่ง: <span className="font-semibold">{dup.senders.join(', ')}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display Conflicts (currently not populated by logic) */}
                  {validationResult.conflicts.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg border-2 border-red-500 shadow-sm">
                      <h4 className="font-bold text-red-800 mb-3 text-lg flex items-center">
                        <XCircle className="w-5 h-5 mr-2" />
                        ข้อมูลที่ไม่ตรงกัน:
                      </h4>
                      <div className="space-y-2">
                        {validationResult.conflicts.map((conflict, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-red-300 shadow-sm">
                            <p className="font-medium text-red-800 text-base">
                              ผู้รับ: {conflict.receiver} | ผู้ส่ง: {conflict.sender}
                            </p>
                            <p className="text-sm text-gray-700">
                              Key: {conflict.key || 'ไม่มี'} | Pass: {conflict.pass || 'ไม่มี'}
                            </p>
                            <p className="text-xs text-red-600">
                              ปัญหา: {conflict.issue}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comparison Statistics */}
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-500 shadow-sm">
                    <h4 className="font-bold text-blue-800 mb-3 text-lg">สถิติการตรวจสอบ:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base">
                      <div className="text-center">
                        <p className="font-bold text-3xl text-blue-600">{validationResult.totalUsers}</p>
                        <p className="text-gray-700">ผู้ใช้ทั้งหมด</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-3xl text-green-600">{validationResult.totalKeys}</p>
                        <p className="text-gray-700">Keys ทั้งหมด</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-3xl text-purple-600">{validationResult.totalPasses}</p>
                        <p className="text-gray-700">Passes ทั้งหมด</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-3xl text-orange-600">{validationResult.duplicates.length}</p>
                        <p className="text-gray-700">ข้อมูลซ้ำ</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <div className="text-center mt-8">
              <button
                onClick={resetAll}
                className="px-10 py-3.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors shadow-md transform hover:scale-105"
              >
                รีเซ็ตทั้งหมด
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 p-6 rounded-xl border-2 border-yellow-200 shadow-sm">
              <h4 className="font-semibold text-yellow-800 mb-3 text-lg">วิธีการใช้งาน:</h4>
              <div className="text-yellow-700 text-base space-y-2">
                <p><strong>1. เพิ่มผู้รับ/ผู้ส่ง:</strong> พิมพ์ชื่อหรือรหัสผู้ใช้ในช่องแล้วกด "เพิ่ม" คุณสามารถ "แก้ไข" หรือ "ลบ" ผู้ใช้ได้จากรายชื่อ</p>
                <p><strong>2. ส่งข้อมูล:</strong> เลือก "ส่งจาก" → เลือก "Key/Pass" → เลือก "ผู้รับ" → ใส่ "ข้อมูล" (สามารถกรอกเป็นข้อความทั่วไป หรือรูปแบบวันที่ DD/MM/YYYY) → กด "ส่ง" ระบบจะเพิ่มข้อมูลลงในรายการ <strong>หากเป็นข้อมูลวันที่และซ้ำกับรายการเดิมจากผู้ส่งและผู้รับคนเดียวกัน จะมีข้อความแจ้งเตือน</strong></p>
                <p><strong>3. ตรวจสอบ:</strong> กดปุ่ม "ตรวจสอบผู้รับ ผู้ส่ง ทั้งหมด" เพื่อดูสรุปข้อมูลและรายการที่ซ้ำกันทั่วทั้งระบบ</p>
                <p><strong>หมายเหตุ:</strong> ระบบจะตรวจสอบและแสดงข้อมูลที่ซ้ำกัน (ค่าเดียวกันปรากฏมากกว่าหนึ่งครั้งในระบบ ไม่ว่าจะมาจากผู้ส่งหรือผู้รับคนเดียวกันหรือไม่)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyPassValidator;