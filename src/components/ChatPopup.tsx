import React, { useState, useEffect, useRef } from 'react';
import {  MessageCircle, X, Send, Image as ImageIcon, XCircle, ChevronLeft, CheckCircle, Eye, ArrowLeftRight, UserPlus, Check , Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface SupportCase {
  id: string;
  studentName: string;
  status: 'pending' | 'processing' | 'completed';
  isPublic: boolean;
  publicTitle?: string;
  caseName?: string;
  createdAt: number;
  supporterName?: string;
  coSupporters?: string[];
  pastSupporters?: string[];
  transferRequests?: Record<string, {
    type: 'transfer' | 'add';
    from: string;
    status: 'pending' | 'accepted' | 'rejected';
  }>;
}

export interface SupportMessage {
  id?: string;
  caseId: string;
  senderName: string;
  senderRole: 'student' | 'supporter' | 'admin' | 'system';
  content?: string;
  imageUrl?: string;
  timestamp: number;
  type?: 'text' | 'image' | 'system_transfer_request' | 'system_add_request' | 'system_transfer_accepted' | 'system_transfer_rejected' | 'system_add_accepted' | 'system_add_rejected';
  targetSupporter?: string;
  actionStatus?: 'pending' | 'accepted' | 'rejected';
}

export const ChatPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<'none' | 'supporter' | 'student'>('none');
  
  // Supporter states
  const [supporterCodeInput, setSupporterCodeInput] = useState('');
  const [supporterNameInput, setSupporterNameInput] = useState('');
  const [isSupporterAuth, setIsSupporterAuth] = useState(false);
  
  // Student states
  const [studentNameInput, setStudentNameInput] = useState('');
  const [isStudentAuth, setIsStudentAuth] = useState(false);
  
  // Cases states
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState<SupportCase | null>(null);
  const [allCases, setAllCases] = useState<SupportCase[]>([]);
  const allCasesRef = useRef<SupportCase[]>([]);
  useEffect(() => {
    allCasesRef.current = allCases;
  }, [allCases]);
  const [publicCases, setPublicCases] = useState<SupportCase[]>([]);
  const [studentActiveCases, setStudentActiveCases] = useState<SupportCase[]>([]);
  const [studentCompletedCases, setStudentCompletedCases] = useState<SupportCase[]>([]);
  const [showNewCasePrompt, setShowNewCasePrompt] = useState(false);
  const [newCaseNameInput, setNewCaseNameInput] = useState('');
  const [isCompletedCasesOpen, setIsCompletedCasesOpen] = useState(false);
  const [isPublicCasesOpen, setIsPublicCasesOpen] = useState(false);
  
  // Messages states
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPublicTitlePrompt, setShowPublicTitlePrompt] = useState(false);
  const [publicTitleInput, setPublicTitleInput] = useState('');
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showTransferPopup, setShowTransferPopup] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showEditNamePopup, setShowEditNamePopup] = useState(false);
  const [editCaseNameInput, setEditCaseNameInput] = useState('');
  const [supportersList, setSupportersList] = useState<{name: string, code: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Restore session
    const savedRole = localStorage.getItem('chat_role') as 'supporter' | 'student' | null;
    if (savedRole === 'supporter') {
      const savedName = localStorage.getItem('chat_supporterName');
      if (savedName) {
        setRole('supporter');
        setSupporterNameInput(savedName);
        setIsSupporterAuth(true);
      }
    } else if (savedRole === 'student') {
      const savedName = localStorage.getItem('chat_studentName');
      if (savedName) {
        setRole('student');
        setStudentNameInput(savedName);
        setIsStudentAuth(true);
      }
      const savedCaseId = localStorage.getItem('chat_activeCaseId');
      if (savedCaseId) {
        setActiveCaseId(savedCaseId);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (role === 'supporter' && isSupporterAuth && isOpen) {
      getDoc(doc(db, 'config', 'global')).then((docSnap) => {
        if (docSnap.exists()) {
          setSupportersList(docSnap.data().supporters || []);
        }
      });
    }
  }, [role, isSupporterAuth, isOpen]);

  // Notifications for Supporter
  useEffect(() => {
    if (role === 'supporter' && isSupporterAuth && !isOpen) {
      const now = Date.now();
      
      const qCases = query(
        collection(db, 'support_cases'),
        where('createdAt', '>', now),
        orderBy('createdAt', 'desc')
      );
      const unsubCases = onSnapshot(qCases, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newCase = change.doc.data();
            if (newCase.status === 'pending') {
              setUnreadCount(prev => prev + 1);
            }
          }
        });
      });

      const qMsgs = query(
        collection(db, 'support_messages'),
        where('timestamp', '>', now),
        orderBy('timestamp', 'asc')
      );
      const unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const msg = change.doc.data();
            if (msg.senderRole === 'student') {
              const caseObj = allCasesRef.current.find(c => c.id === msg.caseId);
              if (caseObj && (caseObj.supporterName === supporterNameInput || (caseObj.coSupporters || []).includes(supporterNameInput))) {
                setUnreadCount(prev => prev + 1);
              }
            } else if (msg.senderRole === 'system' && msg.targetSupporter === supporterNameInput && msg.actionStatus === 'pending') {
              setUnreadCount(prev => prev + 1);
            }
          }
        });
      });

    


  return () => {
        unsubCases();
        unsubMsgs();
      };
    }
  }, [role, isSupporterAuth, isOpen, supporterNameInput]);

  // Notifications for Student
  useEffect(() => {
    const studentCaseId = activeCaseId || (typeof window !== 'undefined' ? localStorage.getItem('chat_activeCaseId') : null);
    if (role === 'student' && isStudentAuth && !isOpen && studentCaseId) {
      const now = Date.now();
      const q = query(
        collection(db, 'support_messages'),
        where('caseId', '==', studentCaseId),
        where('timestamp', '>', now),
        orderBy('timestamp', 'asc')
      );
      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const msg = change.doc.data();
            if (msg.senderRole !== 'student') {
              setUnreadCount(prev => prev + 1);
            }
          }
        });
      });
    
  return () => unsub();
    }
  }, [role, isStudentAuth, isOpen, activeCaseId]);

  // Fetch cases for supporter
  useEffect(() => {
    if (role === 'supporter' && isSupporterAuth) {
      const q = query(collection(db, 'support_cases'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cases: SupportCase[] = [];
        snapshot.forEach((doc) => {
          cases.push({ id: doc.id, ...doc.data() } as SupportCase);
        });
        setAllCases(cases);
      });
    
  return () => unsubscribe();
    }
  }, [role, isSupporterAuth]);

  // Fetch active and completed cases for current student
  useEffect(() => {
    if (role === 'student' && isStudentAuth) {
      const q = query(collection(db, 'support_cases'), where('studentName', '==', studentNameInput));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const active: SupportCase[] = [];
        const completed: SupportCase[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as SupportCase;
          if (data.status === 'pending' || data.status === 'processing') {
            active.push({ id: doc.id, ...data });
          } else if (data.status === 'completed') {
            completed.push({ id: doc.id, ...data });
          }
        });
        // Sort completed cases by createdAt descending
        completed.sort((a, b) => b.createdAt - a.createdAt);
        setStudentActiveCases(active);
        setStudentCompletedCases(completed);
      });
      return () => unsubscribe();
    }
  }, [role, isStudentAuth, studentNameInput]);

  // Fetch public cases for student
  useEffect(() => {
    if (role === 'student' && !activeCaseId) {
      const q = query(collection(db, 'support_cases'), where('isPublic', '==', true), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cases: SupportCase[] = [];
        snapshot.forEach((doc) => {
          cases.push({ id: doc.id, ...doc.data() } as SupportCase);
        });
        setPublicCases(cases);
      });
    
  return () => unsubscribe();
    }
  }, [role, activeCaseId]);

  // Fetch active case details
  useEffect(() => {
    if (activeCaseId) {
      const unsubscribe = onSnapshot(doc(db, 'support_cases', activeCaseId), (docSnap) => {
        if (docSnap.exists()) {
          setActiveCase({ id: docSnap.id, ...docSnap.data() } as SupportCase);
        } else {
          setActiveCase(null);
          setActiveCaseId(null);
          localStorage.removeItem('chat_activeCaseId');
        }
      });
    
  return () => unsubscribe();
    } else {
      setActiveCase(null);
    }
  }, [activeCaseId]);

  // Fetch messages for active case
  useEffect(() => {
    if (activeCaseId) {
      const q = query(collection(db, 'support_messages'), where('caseId', '==', activeCaseId), orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs: SupportMessage[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as SupportMessage);
        });
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
    
  return () => unsubscribe();
    } else {
      setMessages([]);
    }
  }, [activeCaseId]);

    const handleSupporterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supporterCodeInput.trim()) {
      alert('Vui lòng nhập mã tiếp nhận hỗ trợ.');
      return;
    }
    
    try {
      const configDoc = await getDoc(doc(db, 'config', 'global'));
      if (configDoc.exists()) {
        const supporters = configDoc.data().supporters || [];
        const matched = supporters.find((s: any) => s.code === supporterCodeInput.trim());
        
        if (matched) {
          setSupporterNameInput(matched.name);
          setIsSupporterAuth(true);
          localStorage.setItem('chat_role', 'supporter');
          localStorage.setItem('chat_supporterName', matched.name);
        } else {
          alert('Mã tiếp nhận hỗ trợ không chính xác!');
        }
      } else {
        alert('Cấu hình chưa được khởi tạo.');
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi xác thực.');
    }
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentNameInput.trim()) {
      setIsStudentAuth(true);
      localStorage.setItem('chat_role', 'student');
      localStorage.setItem('chat_studentName', studentNameInput.trim());
    }
  };

  const handleCreateCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseNameInput.trim()) return;

    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `CASE-${dd}${mm}`;
      
      const q = query(
        collection(db, 'support_cases'),
        where('id', '>=', prefix),
        where('id', '<=', prefix + '\\uf8ff')
      );
      const querySnapshot = await getDocs(q);
      
      let maxSeq = 0;
      querySnapshot.forEach((doc) => {
        const idStr = doc.id;
        if (idStr.startsWith(prefix)) {
          const seqStr = idStr.substring(prefix.length);
          const seq = parseInt(seqStr, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      });
      
      const nextSeq = String(maxSeq + 1).padStart(2, '0');
      const newCaseId = `${prefix}${nextSeq}`;

      const newCase: SupportCase = {
        id: newCaseId,
        studentName: studentNameInput.trim(),
        caseName: newCaseNameInput.trim(),
        status: 'pending',
        isPublic: false,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'support_cases', newCaseId), newCase);
      setActiveCaseId(newCaseId);
      localStorage.setItem('chat_activeCaseId', newCaseId);
      setShowNewCasePrompt(false);
      setNewCaseNameInput('');
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tạo case.');
    }
  };

  const handleProcessCase = async (caseId: string) => {
    try {
      await updateDoc(doc(db, 'support_cases', caseId), {
        status: 'processing',
        supporterName: supporterNameInput.trim()
      });
      setActiveCaseId(caseId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseCaseTemporary = () => {
    setActiveCaseId(null);
  };

  const handleCompleteCase = async () => {
    if (!activeCaseId) return;
    if (true) {
      try {
        await updateDoc(doc(db, 'support_cases', activeCaseId), {
          status: 'completed',
          isPublic: false
        });
        setActiveCaseId(null);
      } catch (error) {
        console.error(error);
        alert('Lỗi: ' + (error as any).message);
      }
    }
  };

  const handleCompleteAndPublicCase = async () => {
    if (!activeCaseId) return;
    setShowPublicTitlePrompt(true);
    setPublicTitleInput('');
  };

  const submitPublicCase = async () => {
    if (!activeCaseId) return;
    try {
      await updateDoc(doc(db, 'support_cases', activeCaseId), {
        status: 'completed',
        isPublic: true,
        publicTitle: publicTitleInput.trim() || activeCaseId
      });
      setShowPublicTitlePrompt(false);
      setActiveCaseId(null);
    } catch (error) {
      console.error(error);
      alert('Lỗi: ' + (error as any).message);
    }
  };


  const handleTransferRequest = async (targetSupporterName: string) => {
    if (!activeCaseId || !activeCase) return;
    try {
      const type = 'transfer';
      await setDoc(doc(db, 'support_cases', activeCaseId), {
        transferRequests: {
          [targetSupporterName]: {
            type,
            from: supporterNameInput,
            status: 'pending'
          }
        }
      }, { merge: true });
      await addDoc(collection(db, 'support_messages'), {
        caseId: activeCaseId,
        senderName: 'Hệ thống',
        senderRole: 'system',
        type: 'system_transfer_request',
        targetSupporter: targetSupporterName,
        actionStatus: 'pending',
        content: `${supporterNameInput} muốn chuyển quyền hỗ trợ case này cho ${targetSupporterName}.`,
        timestamp: Date.now(),
      });
      setShowTransferPopup(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCaseName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaseId) return;
    try {
      await updateDoc(doc(db, 'support_cases', activeCaseId), {
        caseName: editCaseNameInput.trim()
      });
      setShowEditNamePopup(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRequest = async (targetSupporterName: string) => {
    if (!activeCaseId || !activeCase) return;
    try {
      const type = 'add';
      await setDoc(doc(db, 'support_cases', activeCaseId), {
        transferRequests: {
          [targetSupporterName]: {
            type,
            from: supporterNameInput,
            status: 'pending'
          }
        }
      }, { merge: true });
      await addDoc(collection(db, 'support_messages'), {
        caseId: activeCaseId,
        senderName: 'Hệ thống',
        senderRole: 'system',
        type: 'system_add_request',
        targetSupporter: targetSupporterName,
        actionStatus: 'pending',
        content: `${supporterNameInput} muốn thêm ${targetSupporterName} vào hỗ trợ case này.`,
        timestamp: Date.now(),
      });
      setShowAddPopup(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptAction = async (msgId: string, caseId: string, type: 'transfer' | 'add', fromSupporter: string) => {
    try {
      const caseRef = doc(db, 'support_cases', caseId);
      const caseSnap = await getDoc(caseRef);
      if (caseSnap.exists()) {
        const cData = caseSnap.data();
        const updates: any = {};
        
        const newTransferReqs = { ...(cData.transferRequests || {}) };
        if (newTransferReqs[supporterNameInput]) {
          newTransferReqs[supporterNameInput].status = 'accepted';
        }
        updates.transferRequests = newTransferReqs;
        
        if (type === 'transfer') {
          const currentPast = cData.pastSupporters || [];
          if (cData.supporterName && !currentPast.includes(cData.supporterName)) {
             updates.pastSupporters = [...currentPast, cData.supporterName];
          }
          updates.supporterName = supporterNameInput;
        } else if (type === 'add') {
          const currentCo = cData.coSupporters || [];
          if (!currentCo.includes(supporterNameInput)) {
            updates.coSupporters = [...currentCo, supporterNameInput];
          }
        }
        await updateDoc(caseRef, updates);
      }
      
      const msgRef = doc(db, 'support_messages', msgId);
      await updateDoc(msgRef, {
        actionStatus: 'accepted'
      });
      
      await addDoc(collection(db, 'support_messages'), {
        caseId,
        senderName: 'Hệ thống',
        senderRole: 'system',
        type: type === 'transfer' ? 'system_transfer_accepted' : 'system_add_accepted',
        targetSupporter: supporterNameInput,
        content: `${supporterNameInput} đã đồng ý ${type === 'transfer' ? 'nhận quyền' : 'tham gia'} hỗ trợ.`,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectAction = async (msgId: string, caseId: string, type: 'transfer' | 'add', fromSupporter: string) => {
    try {
      const caseRef = doc(db, 'support_cases', caseId);
      const caseSnap = await getDoc(caseRef);
      if (caseSnap.exists()) {
        const cData = caseSnap.data();
        const newTransferReqs = { ...(cData.transferRequests || {}) };
        if (newTransferReqs[supporterNameInput]) {
          newTransferReqs[supporterNameInput].status = 'rejected';
        }
        await updateDoc(caseRef, { transferRequests: newTransferReqs });
      }
      
      const msgRef = doc(db, 'support_messages', msgId);
      await updateDoc(msgRef, {
        actionStatus: 'rejected'
      });
      
      await addDoc(collection(db, 'support_messages'), {
        caseId,
        senderName: 'Hệ thống',
        senderRole: 'system',
        type: type === 'transfer' ? 'system_transfer_rejected' : 'system_add_rejected',
        targetSupporter: supporterNameInput,
        content: `Người trợ lực mà bạn yêu cầu (${supporterNameInput}) đã từ chối.`,
        timestamp: Date.now(),
      });
      
      setActiveCaseId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !activeCaseId) return;

    const senderName = role === 'supporter' ? supporterNameInput : studentNameInput;
    
    if (selectedImage && selectedImage.length > 900 * 1024) {
      alert('Kích thước ảnh quá lớn để gửi. Vui lòng chọn ảnh khác.');
      return;
    }

    const msg: any = {
      caseId: activeCaseId,
      senderName,
      senderRole: role,
      timestamp: Date.now(),
    };

    if (newMessage.trim()) {
      msg.content = newMessage.trim();
    }

    if (selectedImage) {
      msg.imageUrl = selectedImage;
    }

    try {
      await addDoc(collection(db, 'support_messages'), msg);
      setNewMessage('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress with WebP (or JPEG)
          const dataUrl = canvas.toDataURL('image/webp', 0.7);
          
          // Check if it is still too large for Firestore (~1MB limit, so limit base64 to ~700KB)
          if (dataUrl.length > 700 * 1024) {
            alert('Ảnh sau khi nén vẫn quá lớn. Vui lòng chọn ảnh khác nhỏ hơn.');
            return;
          }
          
          setSelectedImage(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_role');
    localStorage.removeItem('chat_supporterName');
    localStorage.removeItem('chat_studentName');
    localStorage.removeItem('chat_activeCaseId');
    setRole('none');
    setIsSupporterAuth(false);
    setIsStudentAuth(false);
    setActiveCaseId(null);
  };


  const isMyPendingRequest = (c: SupportCase) => {
    const req = c.transferRequests?.[supporterNameInput];
    return req && req.status === 'pending';
  };
  const isCoSupporter = (c: SupportCase) => {
    return c.coSupporters?.includes(supporterNameInput);
  };
  const isPastSupporter = (c: SupportCase) => {
    return c.pastSupporters?.includes(supporterNameInput);
  };
  const filterSupporterCase = (c: SupportCase) => {
    return c.status === 'pending' || 
           ((c.status === 'processing' || c.status === 'completed') && 
            (c.supporterName === supporterNameInput || isCoSupporter(c) || isMyPendingRequest(c) || isPastSupporter(c)));
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-12 h-12 md:w-14 md:h-14 bg-[#3C3633] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#5A5A40] transition-transform hover:scale-105 z-50"
      >
        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-[calc(100vw-32px)] sm:w-[380px] h-[550px] sm:h-[600px] md:bottom-24 md:right-6 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[60] border border-[#E2E2D8]">
          {/* Header */}
          <div className="p-4 bg-[#3C3633] text-white flex flex-col justify-between items-start">
            <div className="w-full flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {activeCaseId ? (
                  <button onClick={() => setActiveCaseId(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                ) : role !== 'none' ? (
                  <button onClick={() => { setRole('none'); localStorage.removeItem('chat_role'); }} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                ) : null}
                <h3 className="font-bold text-sm">{activeCaseId ? activeCaseId.replace('CASE-', 'CASE - ') : 'Hỗ trợ & Tương tác'}</h3>
              </div>
              <div className="flex items-center gap-1">
                {role === 'supporter' && isSupporterAuth && activeCaseId && activeCase?.supporterName === supporterNameInput && (
                  <>
                    <button
                      onClick={() => {
                        setEditCaseNameInput(activeCase?.caseName || activeCase?.id || '');
                        setShowEditNamePopup(true);
                      }}
                      className="hover:bg-white/20 p-1 rounded-full transition-colors"
                      title="Sửa tên case"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowTransferPopup(true)}
                      className="hover:bg-white/20 p-1 rounded-full transition-colors"
                      title="Chuyển quyền hỗ trợ"
                    >
                      <ArrowLeftRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowAddPopup(true)}
                      className="hover:bg-white/20 p-1 rounded-full transition-colors"
                      title="Thêm người hỗ trợ"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 p-1 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {((role === 'supporter' && isSupporterAuth) || (role === 'student' && isStudentAuth)) && (
              <div className="w-full flex justify-between items-center text-[10px]">
                {activeCaseId && activeCase ? (
                  <div className="flex flex-wrap items-center gap-1 opacity-90">
                    <span className="mr-1">Với:</span>
                    {(() => {
                      const myName = role === 'supporter' ? supporterNameInput : studentNameInput;
                      const others = [];
                      if (activeCase.studentName && activeCase.studentName !== myName) {
                        others.push({ name: activeCase.studentName, type: 'student' });
                      }
                      if (activeCase.supporterName && activeCase.supporterName !== myName) {
                        others.push({ name: activeCase.supporterName, type: 'supporter' });
                      }
                      if (activeCase.coSupporters) {
                        activeCase.coSupporters.forEach(co => {
                          if (co && co !== myName && !others.find(o => o.name === co)) {
                            others.push({ name: co, type: 'supporter' });
                          }
                        });
                      }
                      if (others.length === 0) {
                        return <span className="text-gray-300 italic">Chưa có người tiếp nhận</span>;
                      }
                      return others.map((p, idx, arr) => (
                        <span key={idx} className={p.type === 'student' ? 'text-blue-300 font-semibold' : 'text-yellow-300 font-semibold'}>
                          {p.name}{idx < arr.length - 1 ? ', ' : ''}
                        </span>
                      ));
                    })()}
                  </div>
                ) : (
                  <span className="opacity-80">{role === 'supporter' ? supporterNameInput : studentNameInput}</span>
                )}
                <div className="flex items-center gap-2">
                  {activeCase && (
                    <span className={`font-semibold ${activeCase.status === 'completed' ? 'text-green-300' : (activeCase.status === 'processing' ? 'text-yellow-300' : 'text-gray-300')}`}>
                      {activeCase.status === 'pending' ? 'Chờ xử lý' : (activeCase.status === 'processing' ? 'Đang xử lý' : 'Đã hoàn thành')}
                    </span>
                  )}
                  {!activeCaseId && (
                    <button onClick={handleLogout} className="underline hover:text-red-300">Đăng xuất</button>
                  )}
                </div>
              </div>
            )}
            {activeCase && (
               <div className="w-full text-xs mt-1 py-1 px-2 bg-white/10 rounded font-semibold">
                 <span>Case: {activeCase.caseName || activeCase.id}</span>
               </div>
            )}
          </div>

          {/* Body */}
          {showEditNamePopup && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-4 w-full max-w-sm shadow-xl">
                <h4 className="font-bold text-[#3C3633] mb-3">Đổi tên case</h4>
                <form onSubmit={handleSaveCaseName}>
                  <input
                    type="text"
                    value={editCaseNameInput}
                    onChange={(e) => setEditCaseNameInput(e.target.value)}
                    placeholder="Nhập tên case..."
                    className="w-full p-2 border border-gray-300 rounded text-sm mb-4 focus:outline-none focus:border-gray-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowEditNamePopup(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded hover:bg-gray-200">
                      Hủy
                    </button>
                    <button type="submit" className="flex-1 py-2 bg-[#5A5A40] text-white text-xs font-bold rounded hover:bg-[#4A4A35]">
                      Lưu
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {showTransferPopup && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-4 w-full max-w-sm shadow-xl">
                <h4 className="font-bold text-[#3C3633] mb-3">Chuyển quyền hỗ trợ</h4>
                <p className="text-xs text-gray-500 mb-3">Chọn người trợ lực để chuyển quyền xử lý case này.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                  {supportersList.filter(s => s.name !== supporterNameInput).map(s => (
                    <button
                      key={s.code}
                      onClick={() => handleTransferRequest(s.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                  {supportersList.filter(s => s.name !== supporterNameInput).length === 0 && (
                    <p className="text-xs text-center text-gray-500 py-2">Không có người trợ lực khác.</p>
                  )}
                </div>
                <button onClick={() => setShowTransferPopup(false)} className="w-full py-2 bg-gray-200 text-gray-700 rounded text-sm font-bold hover:bg-gray-300">
                  Hủy
                </button>
              </div>
            </div>
          )}

          {showAddPopup && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-4 w-full max-w-sm shadow-xl">
                <h4 className="font-bold text-[#3C3633] mb-3">Thêm người hỗ trợ</h4>
                <p className="text-xs text-gray-500 mb-3">Chọn người trợ lực để cùng hỗ trợ case này.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                  {supportersList.filter(s => s.name !== supporterNameInput && !(activeCase?.coSupporters || []).includes(s.name)).map(s => (
                    <button
                      key={s.code}
                      onClick={() => handleAddRequest(s.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                  {supportersList.filter(s => s.name !== supporterNameInput && !(activeCase?.coSupporters || []).includes(s.name)).length === 0 && (
                    <p className="text-xs text-center text-gray-500 py-2">Không có người trợ lực khác.</p>
                  )}
                </div>
                <button onClick={() => setShowAddPopup(false)} className="w-full py-2 bg-gray-200 text-gray-700 rounded text-sm font-bold hover:bg-gray-300">
                  Hủy
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-[#F9F9F7] relative flex flex-col">
            <AnimatePresence mode="wait">
            {role === 'none' && (
              <motion.div 
                key="role-none"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="p-6 flex flex-col items-center justify-center h-full space-y-6"
              >
                <p className="text-gray-600 font-medium">Bạn đang là?</p>
                <button
                  onClick={() => setRole('supporter')}
                  className="w-full py-3 bg-[#5A5A40] text-white rounded-lg font-bold hover:bg-[#4A4A35] transition-colors"
                >
                  Người trợ lực
                </button>
                <button
                  onClick={() => setRole('student')}
                  className="w-full py-3 bg-[#8B8B7A] text-white rounded-lg font-bold hover:bg-[#7A7A6A] transition-colors"
                >
                  Người học Sống Sáng Suốt
                </button>
              </motion.div>
            )}

            {role === 'supporter' && !isSupporterAuth && (
              <motion.form 
                key="supporter-auth"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSupporterLogin} className="p-6 flex flex-col justify-center h-full space-y-4"
              >
                <h4 className="font-bold text-center text-[#3C3633]">Xác thực Người trợ lực</h4>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Mã tiếp nhận hỗ trợ</label>
                  <input
                    type="text"
                    value={supporterCodeInput}
                    onChange={(e) => setSupporterCodeInput(e.target.value)}
                    className="w-full p-3 border border-[#E2E2D8] rounded-lg focus:outline-none focus:border-[#5A5A40]"
                    placeholder="Nhập mã do quản trị viên cấp"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#3C3633] text-white rounded-lg font-bold hover:bg-[#2A2523] transition-colors mt-4"
                >
                  Xác nhận
                </button>
              </motion.form>
            )}

            {role === 'student' && !isStudentAuth && (
              <motion.form 
                key="student-auth"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleStudentLogin} className="p-6 flex flex-col justify-center h-full space-y-4"
              >
                <h4 className="font-bold text-center text-[#3C3633]">Bắt đầu hỗ trợ</h4>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Tên của bạn</label>
                  <input
                    type="text"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    className="w-full p-3 border border-[#E2E2D8] rounded-lg focus:outline-none focus:border-[#5A5A40]"
                    placeholder="Nhập tên của bạn"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#3C3633] text-white rounded-lg font-bold hover:bg-[#2A2523] transition-colors mt-4"
                >
                  Tiếp tục
                </button>
              </motion.form>
            )}

            {/* List Cases for Supporter */}
            {role === 'supporter' && isSupporterAuth && !activeCaseId && (
              <motion.div 
                key="supporter-dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="p-4 space-y-4"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Các yêu cầu hỗ trợ</h4>
                {allCases.filter(filterSupporterCase).length === 0 ? (
                  <p className="text-center text-sm text-gray-500 italic py-8">Không có case hỗ trợ nào đang chờ.</p>
                ) : (
                  allCases.filter(filterSupporterCase).map(c => (
                    <div key={c.id} className="bg-white border border-[#E2E2D8] p-4 rounded-lg shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-sm text-[#3C3633] mb-1">Mã: {c.id}</p>
                          <p className="text-[10px] text-gray-500 mb-1">Case: {c.caseName || c.publicTitle || c.id}</p>
                          <p className="text-xs text-gray-500">{c.studentName}</p>
                          <p className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${isMyPendingRequest(c) ? 'bg-purple-100 text-purple-700' : (c.status === 'pending' ? 'bg-red-100 text-red-600' : (c.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : (c.status === 'completed' && c.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')))}`}>
                          {isMyPendingRequest(c) ? 'Chờ xác nhận' : (c.status === 'pending' ? 'Chờ' : (c.status === 'processing' ? 'Đang xử lý' : (c.status === 'completed' && c.isPublic ? 'Công khai' : 'Kết thúc')))}
                        </span>
                      </div>
                      {c.status === 'pending' ? (
                        <button onClick={() => handleProcessCase(c.id)} className="w-full py-2 bg-[#5A5A40] text-white text-xs font-bold rounded hover:bg-[#4A4A35]">
                          Tiếp nhận & Xử lý
                        </button>
                      ) : (
                        <button onClick={() => setActiveCaseId(c.id)} className="w-full py-2 border border-[#E2E2D8] text-gray-700 text-xs font-bold rounded hover:bg-gray-50">
                          {isMyPendingRequest(c) ? 'Xem & Xác nhận' : ((c.status === 'processing' && !isPastSupporter(c)) ? 'Tiếp tục xử lý' : 'Xem lại')}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Dashboard for Student */}
            {role === 'student' && isStudentAuth && !activeCaseId && (
              <motion.div 
                key="student-dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="p-4 flex flex-col h-full"
              >
                {studentActiveCases.length > 0 ? (
                  <div className="mb-6">
                    <p className="text-sm text-yellow-600 mb-2 font-semibold text-center">Bạn đang có case hỗ trợ chưa hoàn thành:</p>
                    <div className="space-y-3">
                      {studentActiveCases.map(c => (
                        <div key={c.id} className="bg-white border border-blue-200 p-3 rounded-lg shadow-sm flex flex-col gap-2">
                          <div>
                            <p className="font-bold text-sm text-blue-700 mb-1">Mã: {c.id}</p>
                            <p className="text-[10px] text-gray-500 mb-1">Case: {c.caseName || c.publicTitle || c.id}</p>
                            {c.supporterName && <p className="text-xs text-gray-600"><span className="font-semibold">{c.supporterName}</span></p>}
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => {
                              setActiveCaseId(c.id);
                              localStorage.setItem('chat_activeCaseId', c.id);
                            }}
                            className="w-full py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 mt-1"
                          >
                            <MessageCircle className="w-4 h-4" /> Tiếp tục
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : showNewCasePrompt ? (
                  <form onSubmit={handleCreateCaseSubmit} className="mb-6 bg-[#F9F9F7] p-4 rounded-lg border border-[#E2E2D8]">
                    <h4 className="text-sm font-bold text-[#3C3633] mb-2">Nhập tên case cần hỗ trợ</h4>
                    <input
                      type="text"
                      value={newCaseNameInput}
                      onChange={(e) => setNewCaseNameInput(e.target.value)}
                      placeholder="VD: Khó khăn khi..."
                      className="w-full p-2 border border-[#E2E2D8] rounded text-sm mb-3 focus:outline-none focus:border-[#5A5A40]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowNewCasePrompt(false)} className="flex-1 py-2 bg-white border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-gray-50">Hủy</button>
                      <button type="submit" className="flex-1 py-2 bg-[#3C3633] text-white rounded text-xs font-bold hover:bg-[#2A2523]">Tạo mới</button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowNewCasePrompt(true)}
                    className="w-full py-4 bg-[#3C3633] text-white rounded-lg font-bold shadow-md hover:bg-[#2A2523] transition-colors mb-6 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Bắt đầu case hỗ trợ mới
                  </button>
                )}
                
                <div className="flex-1 overflow-y-auto mt-4">
                  {studentCompletedCases.length > 0 && (
                    <div className="mb-6">
                      <h4 
                        className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center justify-between cursor-pointer hover:text-gray-700 transition-colors"
                        onClick={() => setIsCompletedCasesOpen(!isCompletedCasesOpen)}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Case của bạn đã kết thúc
                        </div>
                        {isCompletedCasesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </h4>
                      {isCompletedCasesOpen && (
                        <div className="space-y-3">
                          {studentCompletedCases.map(c => (
                            <div key={c.id} onClick={() => setActiveCaseId(c.id)} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm cursor-pointer hover:border-gray-400 transition-colors opacity-80">
                              <p className="font-bold text-sm text-gray-700 mb-1">Mã: {c.id}</p>
                              <p className="text-[10px] text-gray-500 mb-1">Case: {c.caseName || c.publicTitle || c.id}</p>
                              {c.supporterName && <p className="text-xs text-gray-600"><span className="font-semibold">{c.supporterName}</span></p>}
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-[#E2E2D8] pt-4">
                    <h4 
                      className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center justify-between cursor-pointer hover:text-gray-700 transition-colors"
                      onClick={() => setIsPublicCasesOpen(!isPublicCasesOpen)}
                    >
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Xem case hỗ trợ công khai đã xử lý
                      </div>
                      {isPublicCasesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </h4>
                    {isPublicCasesOpen && (
                      publicCases.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 italic py-8">Chưa có case nào được công khai.</p>
                      ) : (
                        <div className="space-y-3">
                          {publicCases.map(c => (
                            <div key={c.id} onClick={() => setActiveCaseId(c.id)} className="bg-white border border-[#E2E2D8] p-3 rounded-lg shadow-sm cursor-pointer hover:border-[#5A5A40] transition-colors">
                              <p className="font-bold text-sm text-[#3C3633] mb-1">Mã: {c.id}</p>
                              <p className="text-[10px] text-gray-500 mb-1">Case: {c.caseName || c.publicTitle || c.id}</p>
                              <p className="text-xs text-gray-600"><span className="font-semibold">{c.supporterName}</span></p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Chat View */}
            {activeCaseId && activeCase && (
              <motion.div 
                key="chat-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 italic py-8">
                    Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện.
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    if (msg.senderRole === 'system') {
                      const isRequest = msg.type === 'system_transfer_request' || msg.type === 'system_add_request';
                      const isRejected = msg.type === 'system_transfer_rejected' || msg.type === 'system_add_rejected';
                      
                      // For students, hide the "request" and "rejected" system messages
                      if (role === 'student' && (isRequest || isRejected)) return null;

                      const isTarget = msg.targetSupporter === supporterNameInput;
                      const reqType = msg.type === 'system_transfer_request' ? 'transfer' : 'add';
                      
                      let displayContent = msg.content;
                      if (msg.type === 'system_transfer_accepted') {
                        if (role === 'student') {
                          displayContent = `Yêu cầu của bạn đã được chuyển tiếp cho ${msg.targetSupporter}`;
                        } else if (role === 'supporter') {
                          if (isTarget) displayContent = 'Bạn đã đồng ý nhận quyền hỗ trợ.';
                          else displayContent = `${msg.targetSupporter} đã đồng ý nhận quyền hỗ trợ.`;
                        }
                      } else if (msg.type === 'system_add_accepted') {
                        if (role === 'student') {
                          displayContent = `${msg.targetSupporter} đã tham gia hỗ trợ.`;
                        } else if (role === 'supporter') {
                          if (isTarget) displayContent = 'Bạn đã đồng ý tham gia hỗ trợ.';
                          else displayContent = `${msg.targetSupporter} đã đồng ý tham gia hỗ trợ.`;
                        }
                      }

                    
  return (
                        <motion.div 
                          key={msg.id || index} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex justify-center my-4 w-full"
                        >
                          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex flex-col items-center w-[90%]">
                            <p className="text-xs text-blue-800 mb-2 text-center">{displayContent}</p>
                            {isRequest && isTarget && msg.actionStatus === 'pending' && (
                              <div className="flex gap-2">
                                <button onClick={() => handleAcceptAction(msg.id!, msg.caseId, reqType, msg.senderName)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1"><Check className="w-4 h-4"/> Đồng ý</button>
                                <button onClick={() => handleRejectAction(msg.id!, msg.caseId, reqType, msg.senderName)} className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-1"><X className="w-4 h-4"/> Từ chối</button>
                              </div>
                            )}
                            {isRequest && !isTarget && msg.actionStatus === 'pending' && (
                              <span className="text-[10px] text-yellow-600 font-bold">Chờ đồng ý...</span>
                            )}
                            {isRequest && msg.actionStatus === 'accepted' && (
                              <span className="text-[10px] text-green-600 font-bold">Đã đồng ý</span>
                            )}
                            {isRequest && msg.actionStatus === 'rejected' && (
                              <span className="text-[10px] text-red-600 font-bold">Đã từ chối</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    }

                    const isMe = (role === 'supporter' && msg.senderRole === 'supporter' && msg.senderName === supporterNameInput) || 
                                 (role === 'student' && msg.senderRole === 'student' && msg.senderName === studentNameInput);
                    
                  
  return (
                      <motion.div 
                        key={msg.id || index} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-gray-500 mb-1 ml-1">
                          {msg.senderName}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                            isMe
                              ? 'bg-[#5A5A40] text-white rounded-tr-sm'
                              : 'bg-white border border-[#E2E2D8] text-[#3C3633] rounded-tl-sm'
                          }`}
                        >
                          {msg.content && <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>}
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Attached"
                              className="max-w-full rounded-lg mt-2 max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setViewingImage(msg.imageUrl || null)}
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Footer Input */}
          {activeCaseId && activeCase && (
            <div className="bg-white border-t border-[#E2E2D8] flex flex-col">
              {role === 'supporter' && activeCase.status !== 'completed' && (
                <div className={`p-2 border-b border-[#E2E2D8] bg-[#F9F9F7] grid ${activeCase.supporterName === supporterNameInput ? 'grid-cols-3' : 'grid-cols-1'} gap-2`}>
                  <button onClick={handleCloseCaseTemporary} className="w-full py-2 bg-gray-50 text-gray-700 text-[11px] font-bold rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center">
                    Đóng
                  </button>
                  {activeCase.supporterName === supporterNameInput && (
                    <>
                      <button onClick={handleCompleteCase} className="w-full py-2 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center justify-center">
                        Kết thúc
                      </button>
                      <button onClick={handleCompleteAndPublicCase} className="w-full py-2 bg-green-50 text-green-700 text-[11px] font-bold rounded-lg border border-green-200 hover:bg-green-100 flex items-center justify-center">
                        Công khai
                      </button>
                    </>
                  )}
                </div>
              )}
              {role === 'student' && activeCase.studentName === studentNameInput && activeCase.status !== 'completed' && (
                <div className="p-2 border-b border-[#E2E2D8] bg-[#F9F9F7] grid grid-cols-2 gap-2">
                  <button onClick={handleCloseCaseTemporary} className="w-full py-2 bg-gray-50 text-gray-700 text-[11px] font-bold rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center">
                    Đóng
                  </button>
                  <button onClick={handleCompleteCase} className="w-full py-2 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center justify-center">
                    Kết thúc case
                  </button>
                </div>
              )}
              
              {showPublicTitlePrompt ? (
                <div className="p-4 bg-green-50 border-t border-green-200">
                  <h4 className="text-xs font-bold text-green-800 mb-2">Nhập tên case công khai</h4>
                  <input
                    type="text"
                    value={publicTitleInput}
                    onChange={(e) => setPublicTitleInput(e.target.value)}
                    placeholder="VD: Gặp khó khăn khi thực hành phá chấp..."
                    className="w-full p-2 border border-green-200 rounded text-sm mb-2 focus:outline-none focus:border-green-400"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowPublicTitlePrompt(false)} className="flex-1 py-2 bg-white border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-gray-50">Hủy</button>
                    <button onClick={submitPublicCase} className="flex-1 py-2 bg-green-600 rounded text-xs font-bold text-white hover:bg-green-700">Xác nhận công khai</button>
                  </div>
                </div>
              ) : (activeCase.status === 'completed' || 
                   (role === 'student' && activeCase.studentName !== studentNameInput) ||
                   (role === 'supporter' && (
                     isMyPendingRequest(activeCase) || 
                     isPastSupporter(activeCase) || 
                     (activeCase.supporterName !== supporterNameInput && !isCoSupporter(activeCase))
                   ))) ? (
                <div className="p-4 text-center text-sm text-gray-500 italic bg-[#F5F5F0]">
                  {activeCase.status === 'completed' 
                    ? 'Case hỗ trợ này đã kết thúc.' 
                    : isMyPendingRequest(activeCase)
                      ? 'Vui lòng xác nhận yêu cầu (Đồng ý/Từ chối) ở tin nhắn trên để có thể trò chuyện.'
                      : 'Bạn chỉ có quyền xem nội dung chat.'}
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="p-4">
                  {selectedImage && (
                    <div className="mb-3 relative inline-block">
                      <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-[#E2E2D8] shadow-sm" />
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 bg-white rounded-full shadow-md text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-[#F9F9F7] border border-[#E2E2D8] rounded-2xl flex items-end p-1 shadow-inner focus-within:border-[#5A5A40] transition-colors">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-[#5A5A40] transition-colors shrink-0"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 max-h-32 min-h-[40px] bg-transparent p-2 text-sm focus:outline-none resize-none"
                        rows={1}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim() && !selectedImage}
                      className="p-3 bg-[#5A5A40] text-white rounded-full hover:bg-[#4A4A35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image Viewer Popup */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setViewingImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/50 p-2 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setViewingImage(null);
            }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={viewingImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
