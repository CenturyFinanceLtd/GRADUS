const ADMIN_PAGE_DEFINITIONS = [
  // Dashboards
  { key: 'dashboard_ai', label: 'Dashboard - AI', path: '/', category: 'Dashboards' },
  { key: 'dashboard_crm', label: 'Dashboard - CRM', path: '/index-2', category: 'Dashboards' },
  { key: 'dashboard_ecommerce', label: 'Dashboard - eCommerce', path: '/index-3', category: 'Dashboards' },
  { key: 'dashboard_marketing', label: 'Dashboard - Marketing', path: '/index-4', category: 'Dashboards' },
  { key: 'dashboard_hr', label: 'Dashboard - HR', path: '/index-5', category: 'Dashboards' },
  { key: 'dashboard_finance', label: 'Dashboard - Finance', path: '/index-6', category: 'Dashboards' },
  { key: 'dashboard_support', label: 'Dashboard - Support', path: '/index-7', category: 'Dashboards' },
  { key: 'dashboard_projects', label: 'Dashboard - Projects', path: '/index-8', category: 'Dashboards' },
  { key: 'dashboard_customer', label: 'Dashboard - Customer', path: '/index-9', category: 'Dashboards' },
  { key: 'dashboard_sales', label: 'Dashboard - Sales', path: '/index-10', category: 'Dashboards' },
  { key: 'dashboard_operations', label: 'Dashboard - Operations', path: '/index-11', category: 'Dashboards' },

  // User management
  { key: 'user_add', label: 'Add User', path: '/add-user', category: 'User Management' },
  { key: 'user_list', label: 'Admin Users List', path: '/users-list', category: 'User Management' },
  { key: 'user_grid', label: 'Admin Users Grid', path: '/users-grid', category: 'User Management' },
  { key: 'user_roles', label: 'Assign Role', path: '/assign-role', category: 'User Management' },
  { key: 'user_permissions', label: 'Permission Settings', path: '/permissions', category: 'User Management' },
  { key: 'user_profile', label: 'View Profile', path: '/view-profile', category: 'User Management' },
  { key: 'user_details', label: 'View Details', path: '/view-details', category: 'User Management' },
  // Courses management
  { key: 'courses_admin', label: 'Courses', path: '/courses-admin', category: 'Application' },
  { key: 'customize_courses', label: 'Customize Courses', path: '/customize-courses', category: 'Application' },
  { key: 'blog_list', label: 'Blogs', path: '/blog', category: 'Content & Media' },
  { key: 'blog_details', label: 'Blog Details', path: '/blog/:blogId', category: 'Content & Media' },
  { key: 'blog_details_alt', label: 'Blog Details (Alt)', path: '/blog-details/:blogId', category: 'Content & Media' },
  { key: 'blog_add', label: 'Add Blog', path: '/add-blog', category: 'Content & Media' },
  { key: 'testimonials', label: 'Testimonials', path: '/testimonials', category: 'Application' },
  { key: 'video_generator', label: 'Video Generator', path: '/video-generator', category: 'Content & Media' },
  { key: 'videos', label: 'Videos', path: '/videos', category: 'Content & Media' },
  { key: 'voice_generator', label: 'Voice Generator', path: '/voice-generator', category: 'Content & Media' },
  { key: 'image_generator', label: 'Image Generator', path: '/image-generator', category: 'Content & Media' },
  { key: 'image_upload', label: 'Image Upload', path: '/image-upload', category: 'Content & Media' },
  { key: 'gallery', label: 'Gallery', path: '/gallery', category: 'Content & Media' },
  { key: 'gallery_grid', label: 'Gallery Grid', path: '/gallery-grid', category: 'Content & Media' },
  { key: 'gallery_masonry', label: 'Gallery Masonry', path: '/gallery-masonry', category: 'Content & Media' },
  { key: 'gallery_hover', label: 'Gallery Hover', path: '/gallery-hover', category: 'Content & Media' },
  { key: 'text_generator', label: 'Text Generator', path: '/text-generator', category: 'Content & Media' },
  { key: 'text_generator_new', label: 'Text Generator (New)', path: '/text-generator-new', category: 'Content & Media' },
  { key: 'code_generator', label: 'Code Generator', path: '/code-generator', category: 'Content & Media' },
  { key: 'code_generator_new', label: 'Code Generator (New)', path: '/code-generator-new', category: 'Content & Media' },

  // Communication
  { key: 'email', label: 'Email', path: '/email', category: 'Communication' },
  { key: 'chat_message', label: 'Chat Message', path: '/chat-message', category: 'Communication' },
  { key: 'chat_profile', label: 'Chat Profile', path: '/chat-profile', category: 'Communication' },
  { key: 'notification', label: 'Notification', path: '/notification', category: 'Communication' },
  { key: 'notification_alert', label: 'Notification Alert', path: '/notification-alert', category: 'Communication' },
  { key: 'faq', label: 'FAQ', path: '/faq', category: 'Communication' },
  { key: 'tickets', label: 'Support Tickets', path: '/tickets', category: 'Communication' },
  { key: 'ticket_details', label: 'Ticket Details', path: '/ticket/:id', category: 'Communication' },

  // Sales & commerce
  { key: 'company', label: 'Company', path: '/company', category: 'Sales & Commerce' },
  { key: 'payment_gateway', label: 'Payment Gateway', path: '/payment-gateway', category: 'Sales & Commerce' },
  { key: 'portfolio', label: 'Portfolio', path: '/portfolio', category: 'Sales & Commerce' },
  { key: 'marketplace', label: 'Marketplace', path: '/marketplace', category: 'Sales & Commerce' },
  { key: 'marketplace_details', label: 'Marketplace Details', path: '/marketplace-details', category: 'Sales & Commerce' },
  { key: 'pricing', label: 'Pricing', path: '/pricing', category: 'Sales & Commerce' },
  { key: 'invoice_list', label: 'Invoice List', path: '/invoice-list', category: 'Sales & Commerce' },
  { key: 'invoice_add', label: 'Invoice Add', path: '/invoice-add', category: 'Sales & Commerce' },
  { key: 'invoice_edit', label: 'Invoice Edit', path: '/invoice-edit', category: 'Sales & Commerce' },
  { key: 'invoice_preview', label: 'Invoice Preview', path: '/invoice-preview', category: 'Sales & Commerce' },
  { key: 'wallet', label: 'Wallet', path: '/wallet', category: 'Sales & Commerce' },

  // Learning & support (courses management removed)
  { key: 'inquiries', label: 'Inquiries', path: '/inquiries', category: 'Learning & Support' },
  { key: 'support_list', label: 'List', path: '/list', category: 'Learning & Support' },
  { key: 'support_starred', label: 'Starred', path: '/starred', category: 'Learning & Support' },
  { key: 'support_star_rating', label: 'Star Rating', path: '/star-rating', category: 'Learning & Support' },

  // Productivity
  { key: 'calendar_main', label: 'Calendar Main', path: '/calendar-main', category: 'Productivity' },
  { key: 'calendar', label: 'Calendar', path: '/calendar', category: 'Productivity' },
  { key: 'kanban', label: 'Kanban', path: '/kanban', category: 'Productivity' },
  { key: 'wizard', label: 'Wizard', path: '/wizard', category: 'Productivity' },
  { key: 'task_switch', label: 'Switch', path: '/switch', category: 'Productivity' },

  // Analytics & reports
  { key: 'column_chart', label: 'Column Chart', path: '/column-chart', category: 'Analytics & Reports' },
  { key: 'line_chart', label: 'Line Chart', path: '/line-chart', category: 'Analytics & Reports' },
  { key: 'pie_chart', label: 'Pie Chart', path: '/pie-chart', category: 'Analytics & Reports' },
  { key: 'progress', label: 'Progress', path: '/progress', category: 'Analytics & Reports' },
  { key: 'table_basic', label: 'Table Basic', path: '/table-basic', category: 'Analytics & Reports' },
  { key: 'table_data', label: 'Table Data', path: '/table-data', category: 'Analytics & Reports' },
  { key: 'tabs', label: 'Tabs', path: '/tabs', category: 'Analytics & Reports' },
  { key: 'pagination', label: 'Pagination', path: '/pagination', category: 'Analytics & Reports' },

  // UI Elements
  { key: 'alert', label: 'Alert', path: '/alert', category: 'UI Elements' },
  { key: 'avatar', label: 'Avatar', path: '/avatar', category: 'UI Elements' },
  { key: 'badges', label: 'Badges', path: '/badges', category: 'UI Elements' },
  { key: 'button', label: 'Button', path: '/button', category: 'UI Elements' },
  { key: 'card', label: 'Card', path: '/card', category: 'UI Elements' },
  { key: 'carousel', label: 'Carousel', path: '/carousel', category: 'UI Elements' },
  { key: 'colors', label: 'Colors', path: '/colors', category: 'UI Elements' },
  { key: 'currencies', label: 'Currencies', path: '/currencies', category: 'UI Elements' },
  { key: 'dropdown', label: 'Dropdown', path: '/dropdown', category: 'UI Elements' },
  { key: 'form_layout', label: 'Form Layout', path: '/form-layout', category: 'UI Elements' },
  { key: 'form_validation', label: 'Form Validation', path: '/form-validation', category: 'UI Elements' },
  { key: 'form', label: 'Form', path: '/form', category: 'UI Elements' },
  { key: 'radio', label: 'Radio', path: '/radio', category: 'UI Elements' },
  { key: 'tags', label: 'Tags', path: '/tags', category: 'UI Elements' },
  { key: 'theme', label: 'Theme', path: '/theme', category: 'UI Elements' },
  { key: 'tooltip', label: 'Tooltip', path: '/tooltip', category: 'UI Elements' },
  { key: 'widgets', label: 'Widgets', path: '/widgets', category: 'UI Elements' },
  { key: 'typography', label: 'Typography', path: '/typography', category: 'UI Elements' },

  // Settings & utilities
  { key: 'role_access', label: 'Role Access', path: '/role-access', category: 'Settings & Utilities' },
  { key: 'language', label: 'Language', path: '/language', category: 'Settings & Utilities' },
  { key: 'terms_condition', label: 'Terms & Conditions', path: '/terms-condition', category: 'Settings & Utilities' },
  { key: 'coming_soon', label: 'Coming Soon', path: '/coming-soon', category: 'Settings & Utilities' },
  { key: 'maintenance', label: 'Maintenance', path: '/maintenance', category: 'Settings & Utilities' },
  { key: 'blank_page', label: 'Blank Page', path: '/blank-page', category: 'Settings & Utilities' },
  { key: 'access_denied', label: 'Access Denied', path: '/access-denied', category: 'Settings & Utilities' },

  // Authentication
  { key: 'sign_in', label: 'Sign In', path: '/sign-in', category: 'Authentication', public: true },
  { key: 'sign_up', label: 'Sign Up', path: '/sign-up', category: 'Authentication', public: true },
  { key: 'forgot_password', label: 'Forgot Password', path: '/forgot-password', category: 'Authentication', public: true },
];

const ADMIN_PAGE_KEYS = ADMIN_PAGE_DEFINITIONS.map((page) => page.key);

export { ADMIN_PAGE_DEFINITIONS, ADMIN_PAGE_KEYS };

