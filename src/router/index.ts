import { createRouter, createWebHashHistory } from 'vue-router'
import BoardView from '@/components/board/BoardView.vue'

const router = createRouter({
  // Tauri v2 loads from a custom protocol (tauri://localhost) where
  // HTML5 history mode (pushState) doesn't work. Hash-based routing is required.
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: BoardView
    },
    {
      path: '/parent/:parentCardId',
      name: 'parent-board',
      component: BoardView,
      props: (route) => ({ 
        parentCardId: route.params.parentCardId as string
      })
    }
  ]
})

export default router
