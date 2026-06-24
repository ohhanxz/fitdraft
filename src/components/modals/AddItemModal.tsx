import { Modal } from '../ui/Modal';
import { ItemEditor } from './ItemEditor';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddItemModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Add an item" size="lg">
      <ItemEditor mode="add" active={open} onClose={onClose} />
    </Modal>
  );
}
