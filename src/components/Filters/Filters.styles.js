import styled from "styled-components";

export const FiltersStyles = styled.div`
  padding-top: 10px;
  background-color: white;

  &.filters {
    position: relative;
  }

  &:not(.filters__sidebar) {
    margin-top: 10px;
    min-width: 400px;
    border-radius: 3px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  }

  .filter-line {
    display: flex;
    min-height: 24px;
    max-width: 550px;
    padding: 5px 0 5px 0;
    box-sizing: content-box;
    align-items: flex-start;

    &__conjunction {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      width: 65px;
    }

    &__remove {
      width: 24px;
      height: 24px;
      display: flex;
      margin: 0 5px;
      align-items: center;
      justify-content: center;

      .ant-btn {
        padding: 0;
        margin: 0;
        width: 100%;
        height: 100%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .anticon {
        font-size: 12px;
        line-height: 12px;
      }
    }

    &__settings {
      flex: 1;
      display: flex;
      align-items: flex-start;
    }

    &__column {
      min-height: 24px;
      padding: 0 2px;
    }

    &__operation {
      flex: 0;
    }

    &__value {
      flex: 1;
      display: flex;
    }

    &__group {
      flex: 0;
      display: flex;
      align-items: flex-start;
    }

    .ant-select-selector {
      padding: 0;

      .ant-tag {
        margin: 1px;
        font-size: 12px;
        padding: 3px 5px;
        display: inline-flex;
        align-items: center;
      }

      .ant-tag-text {
        line-height: 12px;
      }
    }
  }

  &.filters__sidebar {
    width: 100%;

    .filter-line {
      padding-right: 10px;
      padding-left: 10px;
      align-items: stretch;

      .ant-divider {
        margin: 0;
        height: 24px;
      }

      &__field {
        width: 100%;
      }

      &__settings {
        flex-direction: column;
      }

      &__remove {
        height: 56px;
      }

      &__group {
        flex: 1;
        padding: 2px 0;
        width: 100%;
      }
    }
  }

  .filters {
    &__actions {
      display: flex;
      margin-top: 10px;
      padding: 0 10px 10px;
      justify-content: space-between;
    }

    &__empty {
      padding: 0 10px;
      font-size: 14px;
      color: #585858;
    }
  }
`;
