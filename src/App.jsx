import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import BookshelfPage from './pages/BookshelfPage';
import ProfilePage from './pages/ProfilePage';
import MyBooksPage from './pages/MyBooksPage';
import BookDetailPage from './pages/BookDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import NotificationPage from './pages/NotificationPage';
import FriendsPage from './pages/FriendsPage';
import FriendProfilePage from './pages/FriendProfilePage';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/bookshelf" element={<BookshelfPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/mybooks/:userId" element={<MyBooksPage />} />
        <Route path="/notifications/:userId" element={<NotificationPage />} />
        <Route path="/friends/:userId" element={<FriendsPage />} />
        <Route path="/friend-profile/:friendId" element={<FriendProfilePage />} />
        <Route path="/book/:bookId" element={<BookDetailPage />} />
        <Route path="/checkout/:bookId" element={<CheckoutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

