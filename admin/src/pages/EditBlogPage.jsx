import { useParams } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import AddBlogLayer from "../components/AddBlogLayer";

const EditBlogPage = () => {
  const { blogId } = useParams();

  return (
    <MasterLayout>
      <Breadcrumb title='Edit Blog' />
      <AddBlogLayer mode='edit' blogId={blogId} />
    </MasterLayout>
  );
};

export default EditBlogPage;
