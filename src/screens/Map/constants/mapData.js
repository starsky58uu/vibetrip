export const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1E1238" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#84A6D3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1E1238" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#A0B6D3" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#9B4A7B" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#241842" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#362360" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1E1238" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#5C6B89" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#140B29" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4A5D7A" }] }
];

export const DUMMY_COMMUNITY_SPOTS = [
  {
    id: 'c1', lat: 25.0330, lng: 121.5654,
    author: { name: 'Moxi_0508', avatar: 'https://i.pravatar.cc/150?img=47' },
    timeAgo: '2h',
    content: '考完試去吃了一碗濃郁的雞白湯拉麵，再找間不限時咖啡廳寫 Code，今天大安區的行程給過 ✨',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop',
    likes: 128, replies: 12, isLiked: false, isSaved: false, isViewed: false,
  },
  {
    id: 'c2', lat: 25.0422, lng: 121.5478,
    author: { name: 'Cyber_Traveler', avatar: 'https://i.pravatar.cc/150?img=11' },
    timeAgo: '5h',
    content: '九份夜拍秘境真的太扯了，不用去象山人擠人。',
    image: 'https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?q=80&w=600&auto=format&fit=crop',
    likes: 85, replies: 4, isLiked: false, isSaved: false, isViewed: false, 
  }
];