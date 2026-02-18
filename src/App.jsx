import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './components/Home/HomePage';
import ExplorePage from './components/ExplorePage';
import HelpPage from './components/HelpPage';
import CommunityPage from './components/CommunityPage';
import LoginRedirect from './components/Auth/LoginRedirect';
import Register from './components/Auth/Register';
import Logout from './components/Auth/Logout';
import UploadForm from './components/Upload/UploadForm';
import UploadFobiData from './components/UploadFobiData';
import { BurungnesiaUpload } from './components/BurnesUpload';
import { KupunesiaUpload } from './components/KupnesUpload';
import { MediaUpload } from './components/FobiUpload';
import ProtectedRoute from './components/ProtectedRoute';
import PilihObservasi from './components/PilihObservasi';
import ChecklistDetail from './components/DetailObservations/ChecklistDetail';
import BirdObservationDetail from './components/DetailObservations/BirdObservation/BirdObservationDetail';
import ButterflyObservationDetail from './components/DetailObservations/ButterflyObservation/ButterflyObservationDetail';
import UserObservationsPage from './components/Home/UserObservationsPage';
import VerificationPending from './components/Auth/VerificationPending';
import VerifyEmail from './components/Auth/VerifyEmail';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import HistoryPage from './components/DetailObservations/HistoryPage';
import AdminHistoryPage from './components/DetailObservations/AdminHistoryPage';
import BantuIdent from './components/BantuIdent/BantuIdent';
import Profile from './pages/Profile';
import ProfileObservations from './pages/ProfileObservations';
import ProfileTaxaFavorites from './pages/ProfileTaxaFavorites';
import ProfileSpecies from './pages/ProfileSpecies';
import ProfileIdentifications from './pages/ProfileIdentifications';
import ProfileDashboard from './pages/ProfileDashboard';
import UserObservations from './pages/UserObservations';
import EditObservation from './pages/EditObservation';
import Leaderboard from './pages/Leaderboard';
import Forum from './pages/Forum';
import ContentPage from './pages/ContentPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { calculateCenterPoint } from './utils/geoHelpers';
import DetailChecklistBurkup from './components/DetailChecklistBurkup';
import AppChecklistDetail from './components/AppChecklistDetail';
import NotificationPage from './components/NotificationPage';
import Messages from './pages/Messages';
import PlatformVerification from './components/Auth/PlatformVerification';
import SyncAccounts from './components/Auth/SyncAccounts';
import { Toaster } from 'react-hot-toast';

const SpeciesGallery = lazy(() => import('./components/SpeciesDetail/SpeciesGallery'));
const SpeciesDetail = lazy(() => import('./components/SpeciesDetail/SpeciesDetail'));
const GenusGallery = lazy(() => import('./components/GenusGallery/GenusGallery'));
const GenusDetail = lazy(() => import('./components/GenusGallery/GenusDetail'));
const TaxonomyNavigator = lazy(() => import('./components/TaxonomyGallery/TaxonomyNavigator'));
const TaxonomyGallery = lazy(() => import('./components/TaxonomyGallery/TaxonomyGallery'));
const TaxonomyDetail = lazy(() => import('./components/TaxonomyGallery/TaxonomyDetail'));
const TaxaDetail = lazy(() => import('./components/TaxaDetail/TaxaDetail'));
const TaxaBrowser = lazy(() => import('./components/TaxaBrowser/TaxaBrowser'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1
        }
    }
});

const AppHeader = (props) => {
  const location = useLocation();
  if (location.pathname === '/') return null;
  return <Header {...props} />;
};

const AppFooter = () => {
  const location = useLocation();
  const [showFooter, setShowFooter] = useState(true);
  
  useEffect(() => {
    const needsDelay = location.pathname.includes('/profile/') && 
                       (location.pathname.includes('/dashboard') || 
                        location.pathname.includes('/spesies') ||
                        location.pathname.includes('/species'));
    
    if (needsDelay) {
      setShowFooter(false);
      const timer = setTimeout(() => {
        setShowFooter(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowFooter(true);
    }
  }, [location.pathname]);
  
  if (location.pathname === '/') return null;
  if (!showFooter) return null;
  return <Footer />;
};

const App = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [stats, setStats] = useState({
    burungnesia: 0,
    kupunesia: 0,
    fobi: 0,
    observasi: 0,
    spesies: 0,
    kontributor: 0,
  });

  const [searchParams, setSearchParams] = useState({
    search: '',
    location: '',
    latitude: '',
    longitude: '',
    searchType: 'all',
    boundingbox: null,
    calculatedRadius: null
  });

  const [filterParams, setFilterParams] = useState({
    start_date: '',
    end_date: '',
    date_type: 'created_at',
    grade: [],
    has_media: false,
    media_type: '',
    radius: 100,
    data_source: ['fobi'],
    user_id: null,
    user_name: '',
    taxonomy_rank: '',
    taxonomy_value: ''
  });

  const handleSearch = (params) => {
    console.log('Search params received in App:', params);

    let centerPoint = null;

    if (params.boundingbox) {
      centerPoint = calculateCenterPoint(
        parseFloat(params.boundingbox[0]),
        parseFloat(params.boundingbox[1]),
        parseFloat(params.boundingbox[2]),
        parseFloat(params.boundingbox[3])
      );
    }

    setSearchParams(prevParams => ({
      ...prevParams,
      ...params,
      boundingbox: params.boundingbox || null,
      calculatedRadius: params.radius || null,
      latitude: centerPoint ? centerPoint.lat : params.latitude,
      longitude: centerPoint ? centerPoint.lng : params.longitude
    }));

    const hasFilterParams = params.radius || params.data_source || params.has_media || 
      params.media_type || params.grade || params.start_date || params.end_date || 
      params.date_type || params.user_id || params.taxonomy_rank || params.taxonomy_value;
    if (hasFilterParams) {
      setFilterParams(prevFilter => ({
        ...prevFilter,
        ...(params.radius !== undefined && { radius: params.radius }),
        ...(params.data_source !== undefined && { data_source: params.data_source }),
        ...(params.has_media !== undefined && { has_media: params.has_media }),
        ...(params.media_type !== undefined && { media_type: params.media_type }),
        ...(params.grade !== undefined && { grade: params.grade }),
        ...(params.start_date !== undefined && { start_date: params.start_date }),
        ...(params.end_date !== undefined && { end_date: params.end_date }),
        ...(params.date_type !== undefined && { date_type: params.date_type }),
        ...(params.user_id !== undefined && { user_id: params.user_id }),
        ...(params.taxonomy_rank !== undefined && { taxonomy_rank: params.taxonomy_rank }),
        ...(params.taxonomy_value !== undefined && { taxonomy_value: params.taxonomy_value }),
      }));
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router>
          <>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  theme: {
                    primary: '#4aed88',
                  },
                },
                error: {
                  duration: 4000,
                  theme: {
                    primary: '#ff4b4b',
                  },
                },
              }}
            />
            <AppHeader
              onSearch={handleSearch}
              searchParams={searchParams}
              filterParams={filterParams}
              setStats={setStats}
            />

            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
                    searchParams={searchParams}
                    filterParams={filterParams}
                    onSearch={handleSearch}
                    stats={stats}
                    setStats={setStats}
                  />
                }
              />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/help" element={<ContentPage pageType="help" />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/about" element={<ContentPage pageType="about" />} />
              <Route path="/privacy" element={<ContentPage pageType="privacy" />} />
              <Route path="/terms" element={<ContentPage pageType="terms" />} />
              <Route path="/login" element={<LoginRedirect />} />
              <Route path="/register" element={<Register />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/verification-pending" element={<VerificationPending />} />
              <Route path="/platform-verification" element={<PlatformVerification />} />
              <Route path="/sync-accounts" element={<SyncAccounts />} />
              <Route path="/verify-email/:token/:tokenType" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/history/:id" element={<HistoryPage />} />
              <Route path="/species-gallery" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <SpeciesGallery />
                </Suspense>
              } />
              <Route path="/species/:taxaId" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <SpeciesDetail />
                </Suspense>
              } />
              <Route path="/genus-gallery" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <GenusGallery />
                </Suspense>
              } />
              <Route path="/genus/:taxaId" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <GenusDetail />
                </Suspense>
              } />
              <Route path="/taxonomy" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <TaxonomyNavigator />
                </Suspense>
              } />
              <Route path="/taxonomy/:rank" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <TaxaBrowser />
                </Suspense>
              } />
              <Route path="/taxa/:rank/:id" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <TaxaDetail />
                </Suspense>
              } />
              <Route path="/:rank/:taxaId" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <TaxonomyDetail />
                </Suspense>
              } />
              <Route path="/upload" element={
                <ProtectedRoute>
                  <UploadForm />
                </ProtectedRoute>
              } />

              <Route path="/upload-fobi" element={
                <ProtectedRoute>
                  <UploadFobiData />
                </ProtectedRoute>
              } />

              <Route path="/media-upload" element={
                <ProtectedRoute>
                  <MediaUpload />
                </ProtectedRoute>
              } />

              <Route path="/burungnesia-upload" element={
                <ProtectedRoute>
                  <BurungnesiaUpload />
                </ProtectedRoute>
              } />

              <Route path="/kupunesia-upload" element={
                <ProtectedRoute>
                  <KupunesiaUpload />
                </ProtectedRoute>
              } />

              <Route path="/pilih-observasi" element={
                <ProtectedRoute>
                  <PilihObservasi />
                </ProtectedRoute>
              } />

              <Route path="/observations/:id" element={
                <ProtectedRoute>
                  <ChecklistDetail />
                </ProtectedRoute>
              } />

              <Route path="/detail-checklist/:id" element={
                <ProtectedRoute>
                  <DetailChecklistBurkup />
                </ProtectedRoute>
              } />

              <Route path="/app-checklist/:id" element={
                <ProtectedRoute>
                  <AppChecklistDetail />
                </ProtectedRoute>
              } />

              <Route path="/burungnesia/observations/:id" element={
                <ProtectedRoute>
                  <BirdObservationDetail />
                </ProtectedRoute>
              } />

              <Route path="/kupunesia/observations/:id" element={
                <ProtectedRoute>
                  <ButterflyObservationDetail />
                </ProtectedRoute>
              } />

              <Route path="/user-observations" element={
                <ProtectedRoute>
                  <UserObservationsPage searchParams={searchParams} />
                </ProtectedRoute>
              } />

              <Route path="/admin-history" element={
                <ProtectedRoute>
                  <AdminHistoryPage />
                </ProtectedRoute>
              } />

              <Route path="/bantu-ident" element={
                <ProtectedRoute>
                    <BantuIdent />
                </ProtectedRoute>
            } />
            <Route path="/profile/:id" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/profile/:id/observasi" element={
              <ProtectedRoute>
                <ProfileObservations />
              </ProtectedRoute>
            } />
            <Route path="/profile/:id/taksa" element={
              <ProtectedRoute>
                <ProfileTaxaFavorites />
              </ProtectedRoute>
            } />
            <Route path="/profile/:id/spesies" element={
              <ProtectedRoute>
                <ProfileSpecies />
              </ProtectedRoute>
            } />
            <Route path="/profile/:id/identifikasi" element={
              <ProtectedRoute>
                <ProfileIdentifications />
              </ProtectedRoute>
            } />
            <Route path="/profile/:id/dashboard" element={
              <ProtectedRoute>
                <ProfileDashboard />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={<NotificationPage />} />
            <Route path="/messages" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            <Route path="/messages/:conversationId" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            <Route path="/admin-history/:id" element={
              <ProtectedRoute>
                <AdminHistoryPage />
              </ProtectedRoute>
            } />

            <Route path="/my-observations" element={
              <ProtectedRoute>
                <UserObservations />
              </ProtectedRoute>
            } />

            <Route path="/edit-observation/:id" element={
              <ProtectedRoute>
                <EditObservation />
              </ProtectedRoute>
            } />

            <Route path="/add-observation" element={
              <ProtectedRoute>
                <BurungnesiaUpload />
              </ProtectedRoute>
            } />
            </Routes>
            <AppFooter />
          </>
        </Router>
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;
