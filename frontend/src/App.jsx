import OurCoursesPage from "./pages/OurCoursesPage.jsx";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import RouteScrollToTop from "./helper/RouteScrollToTop.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import MetaManager from "./components/MetaManager.jsx";
import SiteAnalyticsTracker from "./components/SiteAnalyticsTracker.jsx";
import ChatbotWidget from "./components/ChatbotWidget.jsx";
import HomePageOne from "./pages/HomePageOne";
import AboutPage from "./pages/AboutPage.jsx";
import AboutFourPage from "./pages/AboutFourPage.jsx";
import AboutThreePage from "./pages/AboutThreePage.jsx";
import AboutTwoPage from "./pages/AboutTwoPage.jsx";
import ApplyAdmissionPage from "./pages/ApplyAdmissionPage.jsx";
import BlogPage from "./pages/BlogPage.jsx";
import BlogClassicPage from "./pages/BlogClassicPage.jsx";
import BlogDetailsPage from "./pages/BlogDetailsPage.jsx";
import BlogListPage from "./pages/BlogListPage.jsx";
import BookOnlineClassPage from "./pages/BookOnlineClassPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import CoursePage from "./pages/CoursePage.jsx";
import CourseDetailsPage from "./pages/CourseDetailsPage.jsx";
import CourseListViewPage from "./pages/CourseListViewPage.jsx";
import EventDetailsPage from "./pages/EventDetailsPage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import FaqPage from "./pages/FaqPage.jsx";
import MyCoursesPage from "./pages/MyCoursesPage.jsx";
import FindTutorsPage from "./pages/FindTutorsPage.jsx";
import GalleryPage from "./pages/GalleryPage.jsx";
import CandidatesAndInternsPage from "./pages/CandidatesAndInternsPage.jsx";
import EmployeeAndAlumniPage from "./pages/EmployeeAndAlumniPage.jsx";
import HomePageTwo from "./pages/HomePageTwo.jsx";
import HomePageThree from "./pages/HomePageThree.jsx";
import HomePageFour from "./pages/HomePageFour.jsx";
import InstructorPage from "./pages/InstructorPage.jsx";
import InstructorDetailsPage from "./pages/InstructorDetailsPage.jsx";
import InstructorTwoPage from "./pages/InstructorTwoPage.jsx";
import LessonDetailsPage from "./pages/LessonDetailsPage.jsx";
import PricingPlanPage from "./pages/PricingPlanPage.jsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import InvestorsPrivacyPage from "./pages/InvestorsPrivacyPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import ProductDetailsPage from "./pages/ProductDetailsPage.jsx";
import SignInPage from "./pages/SignInPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import TuitionJobsPage from "./pages/TuitionJobsPage.jsx";
import TutorPage from "./pages/TutorPage.jsx";
import TutorDetailsPage from "./pages/TutorDetailsPage.jsx";
import ShareholdersPrivacyPage from "./pages/ShareholdersPrivacyPage.jsx";
import VisitorPrivacyNotesPage from "./pages/VisitorPrivacyNotesPage.jsx";
import VendorsPrivacyPage from "./pages/VendorsPrivacyPage.jsx";
import HomePageFive from "./pages/HomePageFive.jsx";
import HomePageSix from "./pages/HomePageSix.jsx";
import KnowCFLPage from "./pages/KnowCFLPage.jsx";
import CoursePaymentPage from "./pages/CoursePaymentPage.jsx";

function App() {
  return (
    <BrowserRouter>
      <MetaManager />
      <RouteScrollToTop />
      <SiteAnalyticsTracker />
      <ChatbotWidget />

      <Routes>
        <Route exact path='/' element={<HomePageOne />} />
        <Route exact path='/index-2' element={<HomePageTwo />} />
        <Route exact path='/index-3' element={<HomePageThree />} />
        <Route exact path='/index-4' element={<HomePageFour />} />
        <Route exact path='/index-5' element={<HomePageFive />} />
        <Route exact path='/index-6' element={<HomePageSix />} />
        <Route exact path='/about-us' element={<AboutPage />} />
        <Route exact path='/about-two' element={<AboutTwoPage />} />
        <Route exact path='/about-three' element={<AboutThreePage />} />
        <Route exact path='/about-four' element={<AboutFourPage />} />
        <Route exact path='/know-CFL' element={<KnowCFLPage />} />
        <Route exact path='/apply-admission' element={<ApplyAdmissionPage />} />
        <Route exact path='/blogs' element={<BlogPage />} />
        <Route exact path='/blog-classic' element={<BlogClassicPage />} />
        <Route exact path='/blogs/:slug' element={<BlogDetailsPage />} />
        <Route exact path='/blog-list' element={<BlogListPage />} />
        <Route
          exact
          path='/book-online-class'
          element={<BookOnlineClassPage />}
        />
        <Route exact path='/cart' element={<CartPage />} />
        <Route exact path='/checkout' element={<CheckoutPage />} />
        <Route exact path='/contact' element={<ContactPage />} />
        <Route exact path='/course-grid-view' element={<CoursePage />} />
        <Route exact path='/our-courses' element={<OurCoursesPage />} />
        <Route exact path='/course-details' element={<CourseDetailsPage />} />
        <Route
          exact
          path='/course-list-view'
          element={<CourseListViewPage />}
        />
        <Route exact path='/event-details' element={<EventDetailsPage />} />
        <Route exact path='/events' element={<EventsPage />} />
        <Route exact path='/faq' element={<FaqPage />} />
        <Route
          exact
          path='/my-courses'
          element={
            <RequireAuth>
              <MyCoursesPage />
            </RequireAuth>
          }
        />
        <Route exact path='/favorite-course' element={<Navigate to='/my-courses' replace />} />
        <Route exact path='/find-tutors' element={<FindTutorsPage />} />
        <Route exact path='/gallery' element={<GalleryPage />} />
        <Route exact path='/instructor' element={<InstructorPage />} />
        <Route
          exact
          path='/instructor-details'
          element={<InstructorDetailsPage />}
        />
        <Route exact path='/instructor-two' element={<InstructorTwoPage />} />
        <Route exact path='/lesson-details' element={<LessonDetailsPage />} />
        <Route exact path='/pricing-plan' element={<PricingPlanPage />} />
        <Route exact path='/privacy-policy' element={<PrivacyPolicyPage />} />
        <Route
          exact
          path='/privacy-candidates-interns'
          element={<CandidatesAndInternsPage />}
        />
        <Route
          exact
          path='/privacy-employee-alumni'
          element={<EmployeeAndAlumniPage />}
        />
        <Route
          exact
          path='/privacy-investors'
          element={<InvestorsPrivacyPage />}
        />
        <Route
          exact
          path='/privacy-shareholders'
          element={<ShareholdersPrivacyPage />}
        />
        <Route
          exact
          path='/privacy-visitors'
          element={<VisitorPrivacyNotesPage />}
        />
        <Route
          exact
          path='/privacy-vendors'
          element={<VendorsPrivacyPage />}
        />
        <Route exact path='/product' element={<ProductPage />} />
        <Route exact path='/product-details' element={<ProductDetailsPage />} />
        <Route exact path='/sign-in' element={<SignInPage />} />
        <Route exact path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route exact path='/sign-up' element={<SignUpPage />} />
        <Route
          exact
          path='/profile'
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          exact
          path='/payment'
          element={
            <RequireAuth>
              <CoursePaymentPage />
            </RequireAuth>
          }
        />
        <Route exact path='/tuition-jobs' element={<TuitionJobsPage />} />
        <Route exact path='/tutor' element={<TutorPage />} />
        <Route exact path='/tutor-details' element={<TutorDetailsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;








