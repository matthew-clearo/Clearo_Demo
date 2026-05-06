import { useSession } from "@auth/create/react";

const useUser = () => {
  const sessionState = useSession() || {};
  const {
    data: session = null,
    status = "unauthenticated",
    update = async () => null,
  } = sessionState;
  const user = session?.user || null;

  return {
    user,
    data: user,
    loading: status === 'loading',
    refetch: update,
  };
};

export { useUser }

export default useUser;
