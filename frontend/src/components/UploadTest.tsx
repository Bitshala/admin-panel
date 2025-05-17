/* UploadTest.tsx */
import React, { useState, ChangeEvent } from "react";
import styled, { css } from "styled-components";

/* ───────────────────  styled components ─────────────────── */

const HiddenInput = styled.input`
  display: none;
`;

const Label = styled.label<{ $uploaded: boolean }>`
  background:#1c1c1c; /* red by default  */
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.25s ease;


  ${({ $uploaded }) =>
    $uploaded &&
    css`
      background: #f1760d; /* green once a file is chosen */
    `}
`;

/* ───────────────────  component ─────────────────── */

export interface UploadTestProps {
  /** Optional callback to receive the chosen file */
  onFileSelected?: (file: File) => void;
}

const UploadTest: React.FC<UploadTestProps> = ({ onFileSelected }) => {
  const [fileName, setFileName] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelected?.(file);
    } else {
      setFileName(""); // reset if user clears selection
    }
  };

  const labelText = fileName ? `${fileName}` : "Upload Custom Test";

  return (
    <>
      <HiddenInput id="test-upload" type="file" onChange={handleChange} />
      <Label htmlFor="test-upload" $uploaded={!!fileName}>
        {labelText}
      </Label>
    </>
  );
};

export default UploadTest;
