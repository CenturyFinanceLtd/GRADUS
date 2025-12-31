import ProfileCompletionInner from "../components/ProfileCompletionInner";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const ProfileCompletionPage = () => {
    return (
        <>
            {/* Preloader */}
            <Preloader />

            {/* Animation */}
            <Animation />

            <section className='signin-modern'>
                <div className='signin-modern__shell'>
                    <ProfileCompletionInner />
                </div>
            </section>
        </>
    );
};

export default ProfileCompletionPage;
