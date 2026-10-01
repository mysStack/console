export const workloadStore = () => ({
  usePostMutation: () => ({ mutate: () => undefined, isLoading: false, isError: false }),
  usePutMutation: () => ({ mutate: () => undefined, isLoading: false, isError: false }),
  useGetDetail: () => ({ data: undefined, isLoading: true, isError: false }),
});

export const configMapStore = {
  fetchListByK8s: () => Promise.resolve([]),
};

export const secretStore = {
  fetchNameListByK8s: () => Promise.resolve([]),
};
