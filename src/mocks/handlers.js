/**
 * Mock API Handlers
 * Intercept API requests dan return data dummy
 */

import { http, HttpResponse } from 'msw';
import {
  mockUsers,
  mockTaxa,
  mockObservations,
  mockIdentifications,
  mockComments,
  mockNotifications,
  mockBadges,
  mockStatistics,
  mockMarkers,
  generatePaginatedResponse,
  delay,
} from './data';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Simulated logged in user (for auth endpoints)
let currentUser = null;
let authToken = null;

export const handlers = [
  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    await delay(500);
    const body = await request.json();
    
    const user = mockUsers.find(u => u.email === body.email);
    
    if (user && body.password === 'password123') {
      currentUser = user;
      authToken = 'mock-jwt-token-' + Date.now();
      
      return HttpResponse.json({
        success: true,
        message: 'Login berhasil',
        data: {
          user,
          token: authToken,
          token_type: 'bearer',
          expires_in: 3600,
        },
      });
    }
    
    return HttpResponse.json({
      success: false,
      message: 'Email atau password salah',
      error_code: 'INVALID_CREDENTIALS',
    }, { status: 401 });
  }),

  // Login tanpa /auth prefix (untuk kompatibilitas dengan AuthModal)
  http.post(`${API_URL}/login`, async ({ request }) => {
    await delay(500);
    const body = await request.json();
    
    // AuthModal mengirim login_identifier (bisa email atau username)
    const loginId = body.login_identifier || body.email;
    const user = mockUsers.find(u => 
      u.email === loginId || u.username === loginId
    );
    
    if (user && body.password === 'password123') {
      currentUser = user;
      authToken = 'mock-jwt-token-' + Date.now();
      
      // Format response sesuai dengan yang diharapkan AuthModal
      return HttpResponse.json({
        user: {
          id: user.id,
          uname: user.username,
          fname: user.name.split(' ')[0],
          lname: user.name.split(' ').slice(1).join(' '),
          email: user.email,
          level: user.role === 'curator' ? 2 : 1,
          bio: user.bio,
          profile_picture: user.avatar,
          totalObservations: user.observations_count,
          burungnesia_user_id: null,
          kupunesia_user_id: null,
          license_observation: 'CC-BY-NC',
          license_photo: 'CC-BY-NC',
          license_audio: 'CC-BY-NC',
        },
        token: authToken,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
    }
    
    return HttpResponse.json({
      success: false,
      message: 'Email atau password salah',
      error_code: 'INVALID_CREDENTIALS',
    }, { status: 401 });
  }),

  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    await delay(500);
    const body = await request.json();
    
    const newUser = {
      id: mockUsers.length + 1,
      name: body.name,
      email: body.email,
      username: body.username || body.email.split('@')[0],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${body.name}`,
      observations_count: 0,
      species_count: 0,
      identifications_count: 0,
      followers_count: 0,
      following_count: 0,
      created_at: new Date().toISOString(),
      is_verified: false,
      role: 'user',
    };
    
    return HttpResponse.json({
      success: true,
      message: 'Registrasi berhasil. Silakan cek email untuk verifikasi.',
      data: { user: newUser },
    });
  }),

  http.post(`${API_URL}/auth/logout`, async () => {
    await delay(200);
    currentUser = null;
    authToken = null;
    
    return HttpResponse.json({
      success: true,
      message: 'Logout berhasil',
    });
  }),

  http.get(`${API_URL}/auth/check-token`, async () => {
    await delay(200);
    
    if (currentUser) {
      return HttpResponse.json({
        success: true,
        data: { user: currentUser },
      });
    }
    
    return HttpResponse.json({
      success: false,
      message: 'Token tidak valid',
    }, { status: 401 });
  }),

  // ============================================================================
  // USER PROFILE
  // ============================================================================

  http.get(`${API_URL}/profile/home/:id`, async ({ params }) => {
    await delay(300);
    const userId = parseInt(params.id);
    const user = mockUsers.find(u => u.id === userId);
    
    // Format response sesuai dengan yang diharapkan Profile.jsx
    // Profile.jsx expects: data.data.user, data.data.stats
    const userData = user || {
      id: userId,
      name: 'Demo User',
      username: 'demo_user',
      email: 'demo@example.com',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      bio: 'Demo user untuk development',
      observations_count: 25,
      species_count: 15,
      identifications_count: 42,
      followers_count: 8,
      following_count: 12,
      created_at: '2024-01-15T10:30:00.000Z',
      role: 'user',
    };
    
    // Generate mock followers/following
    const mockFollowers = mockUsers.filter(u => u.id !== userId).slice(0, 3).map(u => ({
      id: u.id,
      uname: u.username,
      profile_picture: u.avatar,
      totalObservations: u.observations_count,
      observations_count: u.observations_count,
    }));
    
    const mockFollowing = mockUsers.filter(u => u.id !== userId).slice(0, 2).map(u => ({
      id: u.id,
      uname: u.username,
      profile_picture: u.avatar,
      totalObservations: u.observations_count,
      observations_count: u.observations_count,
    }));
    
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: userData.id,
          uname: userData.username || userData.name?.toLowerCase().replace(' ', '_'),
          fname: userData.name?.split(' ')[0] || 'Demo',
          lname: userData.name?.split(' ').slice(1).join(' ') || 'User',
          email: userData.email,
          bio: userData.bio || 'Pengamat alam dan pecinta biodiversitas Indonesia',
          profile_picture: userData.avatar || userData.profile_picture,
          level: userData.role === 'curator' ? 3 : (userData.role === 'expert' ? 2 : 1),
          created_at: userData.created_at,
          totalObservations: userData.observations_count,
          burungnesia_email: null,
          kupunesia_email: null,
          burungnesia_email_verified_at: null,
          kupunesia_email_verified_at: null,
          license_observation: 'CC-BY-NC',
          license_photo: 'CC-BY-NC',
          license_audio: 'CC-BY-NC',
          phone: null,
          organization: 'Komunitas Amaturalist',
        },
        stats: {
          // Format as string with commas for UserContext.jsx compatibility
          observasi: userData.observations_count.toLocaleString('id-ID'),
          spesies: userData.species_count.toLocaleString('id-ID'),
          identifikasi: userData.identifications_count.toLocaleString('id-ID'),
          // Also keep numeric versions
          totalObservations: userData.observations_count,
          totalSpecies: userData.species_count,
          totalIdentifications: userData.identifications_count,
          totalIdentPerdana: Math.floor(userData.identifications_count * 0.3),
          fopiObservations: Math.floor(userData.observations_count * 0.6),
          birdObservations: Math.floor(userData.observations_count * 0.25),
          butterflyObservations: Math.floor(userData.observations_count * 0.15),
          birdSpecies: Math.floor(userData.species_count * 0.4),
          butterflySpecies: Math.floor(userData.species_count * 0.2),
        },
        social: {
          followers: mockFollowers,
          following: mockFollowing,
          followersCount: userData.followers_count,
          followingCount: userData.following_count,
        },
        followers: mockFollowers,
        following: mockFollowing,
        followers_count: userData.followers_count,
        following_count: userData.following_count,
      },
    });
  }),

  http.get(`${API_URL}/profile/stats/:id`, async ({ params }) => {
    await delay(300);
    const user = mockUsers.find(u => u.id === parseInt(params.id));
    
    if (user) {
      return HttpResponse.json({
        success: true,
        data: {
          observations_count: user.observations_count,
          species_count: user.species_count,
          identifications_count: user.identifications_count,
          followers_count: user.followers_count,
          following_count: user.following_count,
        },
      });
    }
    
    return HttpResponse.json({ success: false }, { status: 404 });
  }),

  http.get(`${API_URL}/users/:id/profile`, async ({ params }) => {
    await delay(300);
    const user = mockUsers.find(u => u.id === parseInt(params.id));
    
    if (user) {
      return HttpResponse.json({
        success: true,
        data: user,
      });
    }
    
    return HttpResponse.json({ success: false }, { status: 404 });
  }),

  // FOBI Users endpoint (untuk AuthModal setelah login)
  http.get(`${API_URL}/fobi-users/:id`, async ({ params }) => {
    await delay(200);
    const user = mockUsers.find(u => u.id === parseInt(params.id));
    
    if (user) {
      return HttpResponse.json({
        id: user.id,
        uname: user.username,
        fname: user.name.split(' ')[0],
        lname: user.name.split(' ').slice(1).join(' '),
        email: user.email,
        level: user.role === 'curator' ? 2 : 1,
        bio: user.bio,
        profile_picture: user.avatar,
        burungnesia_user_id: null,
        kupunesia_user_id: null,
        license_observation: 'CC-BY-NC',
        license_photo: 'CC-BY-NC',
        license_audio: 'CC-BY-NC',
        created_at: user.created_at,
      });
    }
    
    // Return mock user jika tidak ditemukan (untuk user ID dari localStorage)
    return HttpResponse.json({
      id: parseInt(params.id),
      uname: 'mock_user',
      fname: 'Mock',
      lname: 'User',
      email: 'mock@example.com',
      level: 1,
      bio: 'Mock user untuk development',
      profile_picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mock',
      burungnesia_user_id: null,
      kupunesia_user_id: null,
      license_observation: 'CC-BY-NC',
      license_photo: 'CC-BY-NC',
      license_audio: 'CC-BY-NC',
      created_at: new Date().toISOString(),
    });
  }),

  // User total observations endpoint
  http.get(`${API_URL}/user-total-observations/:id`, async ({ params }) => {
    await delay(200);
    const user = mockUsers.find(u => u.id === parseInt(params.id));
    
    return HttpResponse.json({
      userTotalObservations: user?.observations_count || 0,
    });
  }),

  // ============================================================================
  // OBSERVATIONS
  // ============================================================================

  http.get(`${API_URL}/observations/general`, async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const perPage = parseInt(url.searchParams.get('per_page')) || 10;
    const grade = url.searchParams.get('quality_grade');
    
    let filtered = [...mockObservations];
    
    if (grade) {
      filtered = filtered.filter(o => o.quality_grade === grade);
    }
    
    return HttpResponse.json({
      success: true,
      ...generatePaginatedResponse(filtered, page, perPage),
    });
  }),

  http.get(`${API_URL}/observations/needs-id`, async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    
    const needsId = mockObservations.filter(o => o.quality_grade === 'needs_id');
    
    return HttpResponse.json({
      success: true,
      ...generatePaginatedResponse(needsId, page, 10),
    });
  }),

  http.get(`${API_URL}/observations/:id`, async ({ params }) => {
    await delay(300);
    const observation = mockObservations.find(o => o.id === parseInt(params.id));
    
    if (observation) {
      return HttpResponse.json({
        success: true,
        data: {
          ...observation,
          identifications: mockIdentifications.filter(i => i.observation_id === observation.id),
          comments: mockComments.filter(c => c.observation_id === observation.id),
        },
      });
    }
    
    return HttpResponse.json({ success: false }, { status: 404 });
  }),

  http.get(`${API_URL}/observations/:id/simple`, async ({ params }) => {
    await delay(200);
    const observation = mockObservations.find(o => o.id === parseInt(params.id));
    
    if (observation) {
      return HttpResponse.json({
        success: true,
        data: observation,
      });
    }
    
    return HttpResponse.json({ success: false }, { status: 404 });
  }),

  http.post(`${API_URL}/observations`, async ({ request }) => {
    await delay(600);
    const body = await request.json();
    
    const newObservation = {
      id: mockObservations.length + 1,
      user_id: currentUser?.id || 1,
      user: currentUser || mockUsers[0],
      ...body,
      quality_grade: 'needs_id',
      created_at: new Date().toISOString(),
      identifications_count: 0,
      comments_count: 0,
    };
    
    mockObservations.push(newObservation);
    
    return HttpResponse.json({
      success: true,
      message: 'Observasi berhasil dibuat',
      data: newObservation,
    });
  }),

  // ============================================================================
  // TAXA
  // ============================================================================

  http.get(`${API_URL}/taksa/search`, async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    const results = mockTaxa.filter(t => 
      t.scientific_name.toLowerCase().includes(query.toLowerCase()) ||
      t.cname_species?.toLowerCase().includes(query.toLowerCase())
    );
    
    return HttpResponse.json({
      success: true,
      data: results,
    });
  }),

  http.get(`${API_URL}/taxa/:rank/:id`, async ({ params }) => {
    await delay(300);
    const taxa = mockTaxa.find(t => t.id === parseInt(params.id));
    
    if (taxa) {
      return HttpResponse.json({
        success: true,
        data: {
          ...taxa,
          observations: mockObservations.filter(o => o.taxa_id === taxa.id),
        },
      });
    }
    
    return HttpResponse.json({ success: false }, { status: 404 });
  }),

  http.get(`${API_URL}/taxa/:rank/search`, async ({ request, params }) => {
    await delay(300);
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    const results = mockTaxa.filter(t => 
      t.rank === params.rank &&
      (t.scientific_name.toLowerCase().includes(query.toLowerCase()) ||
       t.cname_species?.toLowerCase().includes(query.toLowerCase()))
    );
    
    return HttpResponse.json({
      success: true,
      data: results,
    });
  }),

  // ============================================================================
  // GALLERY
  // ============================================================================

  http.get(`${API_URL}/gallery/species`, async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    
    const speciesWithMedia = mockTaxa.map(taxa => ({
      ...taxa,
      media: mockObservations
        .filter(o => o.taxa_id === taxa.id)
        .flatMap(o => o.media)
        .slice(0, 1),
    }));
    
    return HttpResponse.json({
      success: true,
      ...generatePaginatedResponse(speciesWithMedia, page, 12),
    });
  }),

  // ============================================================================
  // MAP & MARKERS
  // ============================================================================

  http.get(`${API_URL}/map/markers`, async () => {
    await delay(400);
    
    return HttpResponse.json({
      success: true,
      data: mockMarkers,
    });
  }),

  http.get(`${API_URL}/map/markers/fobi`, async () => {
    await delay(400);
    
    return HttpResponse.json({
      success: true,
      data: mockMarkers,
    });
  }),

  // Markers tanpa /map prefix (untuk kompatibilitas dengan useMarkers hook)
  // useMarkers expects array directly, not { success: true, data: [...] }
  http.get(`${API_URL}/markers`, async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const dataSource = url.searchParams.get('data_source');
    const userId = url.searchParams.get('user_id');
    const grade = url.searchParams.get('grade');
    const hasMedia = url.searchParams.get('has_media');
    
    let markers = [...mockMarkers];
    
    // Filter by data source
    if (dataSource && dataSource !== 'all') {
      markers = markers.filter(m => m.source === dataSource);
    }
    
    // Filter by user
    if (userId) {
      markers = markers.filter(m => m.user_id === parseInt(userId));
    }
    
    // Filter by grade
    if (grade && grade !== 'all') {
      markers = markers.filter(m => m.quality_grade === grade);
    }
    
    // Filter by has_media
    if (hasMedia === 'true') {
      markers = markers.filter(m => m.has_media);
    }
    
    // Return array directly (useMarkers expects this format)
    return HttpResponse.json(markers);
  }),

  http.get(`${API_URL}/fobi-markers`, async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const grade = url.searchParams.get('grade');
    
    let markers = mockMarkers.filter(m => m.source === 'fobi');
    
    if (userId) {
      markers = markers.filter(m => m.user_id === parseInt(userId));
    }
    
    if (grade && grade !== 'all') {
      markers = markers.filter(m => m.quality_grade === grade);
    }
    
    // Return array directly (useMarkers expects this format)
    return HttpResponse.json(markers);
  }),

  // Burungnesia markers
  http.get(`${API_URL}/burungnesia-markers`, async () => {
    await delay(400);
    const markers = mockMarkers.filter(m => m.source === 'burungnesia');
    
    // Return array directly
    return HttpResponse.json(markers);
  }),

  // Kupunesia markers
  http.get(`${API_URL}/kupunesia-markers`, async () => {
    await delay(400);
    const markers = mockMarkers.filter(m => m.source === 'kupunesia');
    
    // Return array directly
    return HttpResponse.json(markers);
  }),

  // ============================================================================
  // HOME & STATISTICS
  // ============================================================================

  http.get(`${API_URL}/home/fobi-count`, async () => {
    await delay(200);
    return HttpResponse.json({
      success: true,
      data: { count: mockStatistics.total_observations },
    });
  }),

  http.get(`${API_URL}/home/total-species`, async () => {
    await delay(200);
    return HttpResponse.json({
      success: true,
      data: { count: mockStatistics.total_species },
    });
  }),

  http.get(`${API_URL}/home/total-contributors`, async () => {
    await delay(200);
    return HttpResponse.json({
      success: true,
      data: { count: mockStatistics.total_users },
    });
  }),

  http.get(`${API_URL}/home/filtered-stats`, async () => {
    await delay(300);
    return HttpResponse.json({
      success: true,
      data: mockStatistics,
    });
  }),

  // Filtered stats tanpa /home prefix (untuk kompatibilitas)
  http.get(`${API_URL}/filtered-stats`, async () => {
    await delay(300);
    return HttpResponse.json({
      success: true,
      data: mockStatistics,
    });
  }),

  // General observations (untuk kompatibilitas)
  http.get(`${API_URL}/general-observations`, async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const perPage = parseInt(url.searchParams.get('per_page')) || 30;
    
    return HttpResponse.json({
      success: true,
      ...generatePaginatedResponse(mockObservations, page, perPage),
    });
  }),

  // Auth media endpoint
  http.get(`${API_URL}/auth-media`, async () => {
    await delay(200);
    
    return HttpResponse.json({
      success: true,
      data: mockObservations.flatMap(o => o.media || []).slice(0, 10),
    });
  }),

  // ============================================================================
  // PROFILE ACTIVITY & TOP TAXA
  // ============================================================================

  // Activity endpoint dengan path /activities (sesuai Profile.jsx)
  http.get(`${API_URL}/profile/activities/:id`, async ({ params, request }) => {
    await delay(300);
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'year';
    
    // Generate activity data based on period
    const generateActivityData = (period) => {
      const data = [];
      const now = new Date();
      let days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          observations: Math.floor(Math.random() * 5),
          identifications: Math.floor(Math.random() * 3),
        });
      }
      return data;
    };
    
    return HttpResponse.json({
      success: true,
      data: generateActivityData(period),
    });
  }),

  // Activity endpoint dengan path /activity (alternatif)
  http.get(`${API_URL}/profile/activity/:id`, async ({ params, request }) => {
    await delay(300);
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'year';
    
    // Generate activity data based on period
    const generateActivityData = (period) => {
      const data = [];
      const now = new Date();
      let days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          observations: Math.floor(Math.random() * 5),
          identifications: Math.floor(Math.random() * 3),
        });
      }
      return data;
    };
    
    return HttpResponse.json({
      success: true,
      data: generateActivityData(period),
    });
  }),

  http.get(`${API_URL}/profile/top-taxa/:id`, async () => {
    await delay(300);
    
    return HttpResponse.json({
      success: true,
      data: {
        observations: mockTaxa.slice(0, 5).map((t, i) => ({
          ...t,
          count: 10 - i * 2,
        })),
        identifications: mockTaxa.slice(0, 5).map((t, i) => ({
          ...t,
          count: 8 - i,
        })),
      },
    });
  }),

  // Profile Dashboard endpoint (ProfileDashboard.jsx)
  http.get(`${API_URL}/profile/dashboard/:id`, async ({ params, request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const perPage = parseInt(url.searchParams.get('per_page')) || 15;
    
    // Generate 10 mock dashboard activities
    const activityTypes = [
      'my_observation',
      'favorite_taxa_observation', 
      'followed_user_observation',
      'observation_comment',
      'mention',
      'comment_reply',
      'grade_change',
    ];
    
    const mockActivities = Array.from({ length: 10 }, (_, i) => {
      const obs = mockObservations[i % mockObservations.length];
      const user = mockUsers[i % mockUsers.length];
      const taxa = mockTaxa[i % mockTaxa.length];
      const type = activityTypes[i % activityTypes.length];
      const daysAgo = i;
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      return {
        id: i + 1,
        type: type,
        checklist_id: obs.id,
        created_at: date.toISOString(),
        data: {
          observer_username: user.username,
          mentioner_username: user.username,
          mentioner: user.name,
          replier_username: user.username,
          replier: user.name,
          commenter_username: user.username,
          comment_body: `Komentar dari ${user.name} tentang observasi ini.`,
          old_grade: 'needs_id',
          new_grade: 'research_grade',
        },
        observation: {
          id: obs.id,
          taxa_name: taxa.scientific_name,
          common_name: taxa.cname_species,
          location_name: obs.location || 'Jakarta, Indonesia',
          observation_date: obs.observation_date,
          quality_grade: obs.quality_grade,
          image_url: obs.media[0]?.url || `https://picsum.photos/seed/dash${i}/400/300`,
          thumbnail_url: obs.media[0]?.thumbnail_url || `https://picsum.photos/seed/dash${i}/200/150`,
          spectrogram_url: null,
          observer: {
            id: user.id,
            username: user.username,
            profile_picture: user.avatar,
          },
        },
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          profile_picture: user.avatar,
        },
      };
    });
    
    // Paginate
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedData = mockActivities.slice(start, end);
    
    return HttpResponse.json({
      success: true,
      data: {
        data: paginatedData,
        current_page: page,
        per_page: perPage,
        total: mockActivities.length,
        last_page: Math.ceil(mockActivities.length / perPage),
        from: start + 1,
        to: Math.min(end, mockActivities.length),
      },
    });
  }),

  // User observations endpoint (ProfileObservations.jsx)
  http.get(`${API_URL}/user-observations/:id`, async ({ params, request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const perPage = parseInt(url.searchParams.get('per_page')) || 12;
    
    const userObservations = mockObservations.filter(o => 
      o.user_id === parseInt(params.id)
    );
    
    return HttpResponse.json({
      success: true,
      ...generatePaginatedResponse(userObservations.length > 0 ? userObservations : mockObservations.slice(0, 5), page, perPage),
    });
  }),

  // Profile observations endpoint (ProfileObservations.jsx)
  http.get(`${API_URL}/profile/observations/:id`, async ({ params, request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const perPage = parseInt(url.searchParams.get('per_page')) || 20;
    const source = url.searchParams.get('source') || 'all';
    const grade = url.searchParams.get('grade') || 'all';
    
    let observations = [...mockObservations];
    
    // Filter by source
    if (source !== 'all') {
      observations = observations.filter(o => o.source === source);
    }
    
    // Filter by grade
    if (grade !== 'all') {
      observations = observations.filter(o => o.quality_grade === grade);
    }
    
    return HttpResponse.json({
      success: true,
      ...generatePaginatedResponse(observations, page, perPage),
      stats: {
        totalObservations: observations.length,
        totalSpecies: 15,
        totalIdentPerdana: 8,
        totalIdentifications: 42,
        fopiObservations: Math.floor(observations.length * 0.6),
        birdObservations: Math.floor(observations.length * 0.25),
        butterflyObservations: Math.floor(observations.length * 0.15),
        birdSpecies: 6,
        butterflySpecies: 3,
        hasBurungnesia: true,
        hasKupunesia: true,
      },
    });
  }),

  // User identifications endpoint (ProfileIdentifications.jsx)
  http.get(`${API_URL}/user-identifications/:id`, async ({ params, request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    
    return HttpResponse.json({
      success: true,
      ...generatePaginatedResponse(mockIdentifications.slice(0, 10), page, 10),
    });
  }),

  // Profile identifications endpoint (ProfileIdentifications.jsx)
  http.get(`${API_URL}/profile/identifications/:id`, async ({ params, request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const perPage = parseInt(url.searchParams.get('per_page')) || 20;
    
    // Generate mock identifications with observation data
    const identifications = mockIdentifications.map((ident, index) => ({
      ...ident,
      observation: mockObservations[index % mockObservations.length],
      taxa: mockTaxa[index % mockTaxa.length],
      is_current: true,
      is_withdrawn: false,
      agrees_with_observation: Math.random() > 0.3,
    }));
    
    return HttpResponse.json({
      success: true,
      ...generatePaginatedResponse(identifications, page, perPage),
    });
  }),

  // Profile life list / species tree (ProfileSpecies.jsx)
  http.get(`${API_URL}/profile/life-list/:id`, async ({ params }) => {
    await delay(500);
    
    // Generate a mock taxonomy tree
    const lifeListData = {
      name: 'Life',
      rank: 'life',
      count: 25,
      children: [
        {
          name: 'Animalia',
          rank: 'kingdom',
          count: 20,
          children: [
            {
              name: 'Chordata',
              rank: 'phylum',
              count: 15,
              children: [
                {
                  name: 'Aves',
                  rank: 'class',
                  count: 10,
                  children: [
                    {
                      name: 'Passeriformes',
                      rank: 'order',
                      count: 6,
                      children: [
                        {
                          name: 'Muscicapidae',
                          rank: 'family',
                          count: 3,
                          children: [
                            { name: 'Copsychus saularis', rank: 'species', count: 2, scientific_name: 'Copsychus saularis', common_name: 'Kacer' },
                            { name: 'Copsychus malabaricus', rank: 'species', count: 1, scientific_name: 'Copsychus malabaricus', common_name: 'Murai Batu' },
                          ]
                        },
                        {
                          name: 'Pycnonotidae',
                          rank: 'family',
                          count: 3,
                          children: [
                            { name: 'Pycnonotus aurigaster', rank: 'species', count: 2, scientific_name: 'Pycnonotus aurigaster', common_name: 'Kutilang' },
                            { name: 'Pycnonotus goiavier', rank: 'species', count: 1, scientific_name: 'Pycnonotus goiavier', common_name: 'Merbah Cerukcuk' },
                          ]
                        }
                      ]
                    },
                    {
                      name: 'Accipitriformes',
                      rank: 'order',
                      count: 4,
                      children: [
                        {
                          name: 'Accipitridae',
                          rank: 'family',
                          count: 4,
                          children: [
                            { name: 'Haliastur indus', rank: 'species', count: 2, scientific_name: 'Haliastur indus', common_name: 'Elang Bondol' },
                            { name: 'Spilornis cheela', rank: 'species', count: 2, scientific_name: 'Spilornis cheela', common_name: 'Elang Ular Bido' },
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  name: 'Mammalia',
                  rank: 'class',
                  count: 5,
                  children: [
                    {
                      name: 'Primates',
                      rank: 'order',
                      count: 3,
                      children: [
                        {
                          name: 'Cercopithecidae',
                          rank: 'family',
                          count: 3,
                          children: [
                            { name: 'Macaca fascicularis', rank: 'species', count: 3, scientific_name: 'Macaca fascicularis', common_name: 'Monyet Ekor Panjang' },
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              name: 'Arthropoda',
              rank: 'phylum',
              count: 5,
              children: [
                {
                  name: 'Insecta',
                  rank: 'class',
                  count: 5,
                  children: [
                    {
                      name: 'Lepidoptera',
                      rank: 'order',
                      count: 5,
                      children: [
                        {
                          name: 'Papilionidae',
                          rank: 'family',
                          count: 3,
                          children: [
                            { name: 'Papilio memnon', rank: 'species', count: 2, scientific_name: 'Papilio memnon', common_name: 'Great Mormon' },
                            { name: 'Troides helena', rank: 'species', count: 1, scientific_name: 'Troides helena', common_name: 'Common Birdwing' },
                          ]
                        },
                        {
                          name: 'Nymphalidae',
                          rank: 'family',
                          count: 2,
                          children: [
                            { name: 'Junonia orithya', rank: 'species', count: 2, scientific_name: 'Junonia orithya', common_name: 'Blue Pansy' },
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'Plantae',
          rank: 'kingdom',
          count: 5,
          children: [
            {
              name: 'Tracheophyta',
              rank: 'phylum',
              count: 5,
              children: [
                {
                  name: 'Magnoliopsida',
                  rank: 'class',
                  count: 5,
                  children: [
                    {
                      name: 'Asparagales',
                      rank: 'order',
                      count: 3,
                      children: [
                        {
                          name: 'Orchidaceae',
                          rank: 'family',
                          count: 3,
                          children: [
                            { name: 'Dendrobium crumenatum', rank: 'species', count: 2, scientific_name: 'Dendrobium crumenatum', common_name: 'Anggrek Merpati' },
                            { name: 'Phalaenopsis amabilis', rank: 'species', count: 1, scientific_name: 'Phalaenopsis amabilis', common_name: 'Anggrek Bulan' },
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    
    return HttpResponse.json({
      success: true,
      data: lifeListData,
    });
  }),

  // Profile favorite taxas (ProfileTaxaFavorites.jsx)
  http.get(`${API_URL}/profile/favorite-taxas/:id`, async ({ params }) => {
    await delay(300);
    
    const favoriteTaxas = mockTaxa.slice(0, 5).map((taxa, index) => ({
      id: index + 1,
      taxa_id: taxa.id,
      user_id: parseInt(params.id),
      taxa: {
        ...taxa,
        photo_url: taxa.photo || `https://api.dicebear.com/7.x/shapes/svg?seed=${taxa.scientific_name}`,
      },
      created_at: new Date(Date.now() - index * 86400000).toISOString(),
    }));
    
    return HttpResponse.json({
      success: true,
      data: favoriteTaxas,
    });
  }),

  // Add favorite taxa
  http.post(`${API_URL}/favorite-taxas`, async ({ request }) => {
    await delay(300);
    const body = await request.json();
    
    return HttpResponse.json({
      success: true,
      message: 'Taksa berhasil ditambahkan ke favorit',
      data: {
        id: Date.now(),
        taxa_id: body.taxa_id,
        user_id: currentUser?.id || 1,
        created_at: new Date().toISOString(),
      },
    });
  }),

  // Delete favorite taxa
  http.delete(`${API_URL}/favorite-taxas/:id`, async ({ params }) => {
    await delay(300);
    
    return HttpResponse.json({
      success: true,
      message: 'Taksa berhasil dihapus dari favorit',
    });
  }),

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  http.get(`${API_URL}/notifications`, async () => {
    await delay(300);
    
    return HttpResponse.json({
      success: true,
      data: mockNotifications,
    });
  }),

  http.get(`${API_URL}/notifications/unread-count`, async () => {
    await delay(200);
    const unread = mockNotifications.filter(n => !n.read).length;
    
    return HttpResponse.json({
      success: true,
      data: { count: unread },
    });
  }),

  http.post(`${API_URL}/notifications/:id/read`, async ({ params }) => {
    await delay(200);
    const notification = mockNotifications.find(n => n.id === parseInt(params.id));
    if (notification) {
      notification.read = true;
    }
    
    return HttpResponse.json({ success: true });
  }),

  // ============================================================================
  // BADGES
  // ============================================================================

  http.get(`${API_URL}/badges`, async () => {
    await delay(300);
    
    return HttpResponse.json({
      success: true,
      data: mockBadges,
    });
  }),

  http.get(`${API_URL}/badges/types`, async () => {
    await delay(200);
    
    return HttpResponse.json({
      success: true,
      data: ['observation', 'identification', 'species', 'community'],
    });
  }),

  // ============================================================================
  // SEARCH
  // ============================================================================

  http.get(`${API_URL}/search`, async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    const users = mockUsers.filter(u => 
      u.name.toLowerCase().includes(query.toLowerCase())
    );
    
    const taxa = mockTaxa.filter(t => 
      t.scientific_name.toLowerCase().includes(query.toLowerCase()) ||
      t.cname_species?.toLowerCase().includes(query.toLowerCase())
    );
    
    const observations = mockObservations.filter(o => 
      o.notes?.toLowerCase().includes(query.toLowerCase()) ||
      o.location_name?.toLowerCase().includes(query.toLowerCase())
    );
    
    return HttpResponse.json({
      success: true,
      data: {
        users,
        taxa,
        observations,
      },
    });
  }),

  // ============================================================================
  // FOLLOW
  // ============================================================================

  http.get(`${API_URL}/follow/status/:userId`, async ({ params }) => {
    await delay(200);
    
    return HttpResponse.json({
      success: true,
      data: {
        is_following: false,
        is_followed_by: false,
      },
    });
  }),

  http.post(`${API_URL}/follow/:userId`, async () => {
    await delay(300);
    
    return HttpResponse.json({
      success: true,
      message: 'Berhasil mengikuti user',
    });
  }),

  // ============================================================================
  // IDENTIFICATIONS
  // ============================================================================

  http.post(`${API_URL}/observations/:id/identifications`, async ({ params, request }) => {
    await delay(400);
    const body = await request.json();
    
    const newIdentification = {
      id: mockIdentifications.length + 1,
      observation_id: parseInt(params.id),
      user_id: currentUser?.id || 1,
      user: currentUser || mockUsers[0],
      taxa_id: body.taxa_id,
      taxa: mockTaxa.find(t => t.id === body.taxa_id),
      body: body.body || '',
      is_current: true,
      agrees_with_observation: body.agrees || true,
      created_at: new Date().toISOString(),
    };
    
    mockIdentifications.push(newIdentification);
    
    return HttpResponse.json({
      success: true,
      message: 'Identifikasi berhasil ditambahkan',
      data: newIdentification,
    });
  }),

  // ============================================================================
  // COMMENTS
  // ============================================================================

  http.get(`${API_URL}/observations/:id/comments`, async ({ params }) => {
    await delay(300);
    const comments = mockComments.filter(c => c.observation_id === parseInt(params.id));
    
    return HttpResponse.json({
      success: true,
      data: comments,
    });
  }),

  http.post(`${API_URL}/observations/:id/comments`, async ({ params, request }) => {
    await delay(400);
    const body = await request.json();
    
    const newComment = {
      id: mockComments.length + 1,
      observation_id: parseInt(params.id),
      user_id: currentUser?.id || 1,
      user: currentUser || mockUsers[0],
      body: body.body,
      created_at: new Date().toISOString(),
    };
    
    mockComments.push(newComment);
    
    return HttpResponse.json({
      success: true,
      message: 'Komentar berhasil ditambahkan',
      data: newComment,
    });
  }),

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  http.get(`${API_URL}/health`, async () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'MOCK API',
      version: '1.0.0',
    });
  }),

  // ============================================================================
  // FALLBACK - Catch all unhandled requests
  // ============================================================================

  http.all(`${API_URL}/*`, async ({ request }) => {
    console.warn(`[MSW] Unhandled ${request.method} request to: ${request.url}`);
    
    return HttpResponse.json({
      success: true,
      data: [],
      message: 'Mock endpoint - no specific handler',
    });
  }),
];
