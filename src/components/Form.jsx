import { useActionState, useRef, useEffect } from 'react';
import supabase from '../supabase-client';
import { useAuth } from '../context/AuthContext';

function Form({ onDealAdded }) {
  const { users, session } = useAuth();

  // Use a ref to keep track of the latest users list to avoid stale closures in the action
  const usersRef = useRef(users);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const [error, submitAction, isPending] = useActionState(
    async (previousState, formData) => {
      const submittedUserId = formData.get('user_id');
      // Use the ref to get the latest users list
      const user = usersRef.current.find((u) => u.id === submittedUserId);

      if (!user) {
        return new Error('Invalid user selected');
      }

      const newDeal = {
        user_id: user.id,
        value: formData.get('value'),
        client_name: formData.get('client_name'),
      };
      console.log('newDeal', newDeal);
      const { error } = await supabase.from('sales_deals').insert(newDeal);
      if (error) {
        console.error('Error adding deal: ', error.message);
        return new Error('Failed to add deal');
      }

      if (onDealAdded) {
        onDealAdded();
      }

      return null;
    },
    null
  );

  const currentUser = users.find((u) => u.id === session?.user?.id);

  if (currentUser?.account_type === 'rep') {
    return null;
  }

  const generateOptions = () => {
    return users
      .filter((user) => user.account_type === 'rep')
      .map((user) => (
        <option key={user.id} value={user.id}>
          {user.name}
        </option>
      ));
  };

  return (
    <div className="add-form-container">
      <form
        action={submitAction}
        aria-label="Add new sales deal"
        aria-describedby="form-description"
      >
        <div id="form-description" className="sr-only">
          Use this form to add a new sales deal. Select a sales rep and enter
          the amount.
        </div>

        {currentUser?.account_type === 'rep' ? (
          <label htmlFor="deal-name">
            Name:
            <input
              id="deal-name"
              type="text"
              value={currentUser?.name || ''}
              readOnly
              className="rep-name-input"
              aria-label="Sales representative name"
              aria-readonly="true"
            />
            <input type="hidden" name="user_id" value={currentUser?.id || ''} />
          </label>
        ) : (
          <label htmlFor="deal-name">
            Name:
            <select
              id="deal-name"
              name="user_id"
              defaultValue=""
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
              disabled={isPending}
            >
              <option value="" disabled>Select a user</option>
              {generateOptions()}
            </select>
          </label>)
        }

        <label htmlFor="client-name">
          Client Name:
          <input
            id="client-name"
            type="text"
            name="client_name"
            aria-required="true"
            aria-invalid={error ? 'true' : 'false'}
            disabled={isPending}
            required
            style={{ backgroundColor: 'white', border: '1px solid #000000ff', borderRadius: '4px' }}
          />
        </label>

        <label htmlFor="deal-value">
          Amount: $
          <input
            id="deal-value"
            type="number"
            name="value"
            defaultValue={0}
            className="amount-input"
            min="0"
            step="10"
            aria-required="true"
            aria-invalid={error ? 'true' : 'false'}
            aria-label="Deal amount in dollars"
            disabled={isPending}
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? 'Adding...' : "Add Deal"}
        </button>
      </form>

      {error && (
        <div role='alert' className="error-message">
          {error.message}
        </div>
      )}
    </div>
  );
};

export default Form;
