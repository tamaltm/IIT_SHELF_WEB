// Debug utility for authentication issues
// Add this to browser console to check/fix auth state

console.log('%c🔍 IITShelf Auth Debug Tool', 'color: #059669; font-size: 16px; font-weight: bold');

// Check current localStorage state
const checkAuthState = () => {
  console.log('\n📦 Current localStorage state:');
  const user = localStorage.getItem('iitshelf_user');
  const oldUserData = localStorage.getItem('userData');
  const oldUserRole = localStorage.getItem('userRole');
  
  console.log('iitshelf_user:', user);
  if (user) {
    try {
      const parsed = JSON.parse(user);
      console.log('  Parsed:', parsed);
      console.log('  Has role?', !!parsed.role);
      console.log('  Role value:', parsed.role);
    } catch (e) {
      console.error('  ❌ Invalid JSON!', e);
    }
  }
  
  console.log('\nOld/duplicate keys (should be null):');
  console.log('userData:', oldUserData);
  console.log('userRole:', oldUserRole);
  
  return { user, oldUserData, oldUserRole };
};

// Clear all auth data
const clearAuth = () => {
  console.log('\n🗑️ Clearing all auth data...');
  localStorage.removeItem('iitshelf_user');
  localStorage.removeItem('userData');
  localStorage.removeItem('userRole');
  console.log('✅ Cleared! Reload page to see effect.');
};

// Fix corrupted auth state
const fixAuthState = () => {
  console.log('\n🔧 Attempting to fix auth state...');
  const user = localStorage.getItem('iitshelf_user');
  
  if (!user) {
    console.log('❌ No user found in localStorage');
    return;
  }
  
  try {
    const parsed = JSON.parse(user);
    
    if (!parsed.role) {
      console.error('❌ User object missing role field!');
      console.log('User needs to login again.');
      clearAuth();
      return;
    }
    
    // Re-save to ensure correct format
    localStorage.setItem('iitshelf_user', JSON.stringify(parsed));
    
    // Clear old duplicate keys
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    
    console.log('✅ Auth state fixed!');
    console.log('Current user:', parsed);
    console.log('🔄 Reload page to see effect.');
  } catch (e) {
    console.error('❌ Error fixing auth state:', e);
    console.log('Clearing corrupted data...');
    clearAuth();
  }
};

// Export functions
window.authDebug = {
  check: checkAuthState,
  clear: clearAuth,
  fix: fixAuthState,
  help: () => {
    console.log('\n📖 Available commands:');
    console.log('  authDebug.check()  - Check current auth state');
    console.log('  authDebug.clear()  - Clear all auth data (logout)');
    console.log('  authDebug.fix()    - Attempt to fix corrupted auth state');
    console.log('  authDebug.help()   - Show this help');
  }
};

// Auto-run check on load
console.log('\n🚀 Auto-checking auth state...');
const state = checkAuthState();

// Auto-fix if needed
if (state.user) {
  try {
    const parsed = JSON.parse(state.user);
    if (!parsed.role) {
      console.warn('\n⚠️ WARNING: User object missing role!');
      console.log('Run authDebug.fix() to clear and require re-login');
    }
  } catch (e) {
    console.error('\n❌ ERROR: Corrupted user data in localStorage');
    console.log('Run authDebug.clear() to fix');
  }
}

if (state.oldUserData || state.oldUserRole) {
  console.warn('\n⚠️ WARNING: Old duplicate auth keys found!');
  console.log('Run authDebug.fix() to clean up');
}

console.log('\n💡 Type authDebug.help() for available commands');
